import path from 'node:path'
import Busboy from 'busboy'
import type Stream from 'node:stream'
import { Readable } from 'node:stream'
import mime from 'mime-types'

// 10GB per file
const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024

const ALLOWED_TYPES: Record<string, string[]> = {
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/avif': ['.avif'],
  'image/gif': ['.gif'],
  // Videos
  'video/mp4': ['.mp4'],
  'video/quicktime': ['.mov'],
  'video/webm': ['.webm'],
}

type UploadResult = { filename: string; path: string; size: number; url: string }
type UploadError = { filename: string; error: string }

function inferKind(mime: string): 'photo' | 'video' {
  return mime.startsWith('video/') ? 'video' : 'photo'
}

function isAllowedFile(filename: string, mime: string) {
  const ext = path.extname(filename).toLowerCase()
  const allowedExts = ALLOWED_TYPES[mime]
  return !!allowedExts && allowedExts.includes(ext)
}

function inferContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  for (const [mime, exts] of Object.entries(ALLOWED_TYPES)) {
    if (exts.includes(ext)) return mime
  }
  return 'application/octet-stream'
}

type SavedFile = {
  slug: string
  originalName: string
  mime: string
  size: number
  relPath: string
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  // const { user } = await requireUserSession(event)
  const fs = useStorage('fs')

  const mediaDir = 'static'
  const notionDbId = config.private.notionDbId as unknown as NotionDB

  const successful: UploadResult[] = []
  const failed: UploadError[] = []
  const savedFiles: SavedFile[] = []

  const fields: Record<string, string> = {}

  const req = event.node.req

  // 1) Resolve projectId and the current highest asset Index (once per request)
  const { slug: projectSlug } = getQuery(event)
  if (!projectSlug) throw createError({ statusCode: 400, statusMessage: 'Missing project slug' })

  const projects = await notionQueryDb<NotionProject>(notion, notionDbId.project)
  const projectId = projects.find(({ properties }) => properties.Slug.formula.string === projectSlug)?.id

  if (!projectId) throw createError({ statusCode: 404, statusMessage: `Project not found for slug: ${projectSlug}` })

  const assets = await notionQueryDb<NotionAsset>(notion, notionDbId.asset, {
    filter: {
      and: [{ property: 'Project', relation: { contains: projectId } }],
    },
  })

  const lastIndex = assets.reduce((max: number, page) => {
    const indexValue = page.properties?.Index?.number ?? 0
    return indexValue > max ? indexValue : max
  }, 0)

  // 2) Extract projectIndex from slug tail: "contacts-...-49" => 49 => "0049"
  const projectIndexNum = (() => {
    const m = (projectSlug as string).match(/(\d+)\s*$/)
    return m ? Number.parseInt(m[1]!, 10) : NaN
  })()
  const projectIndex = String(projectIndexNum).padStart(4, '0')

  // 3) assetIndex increments per file in this request, starting from lastIndex + 1
  let nextAssetIndex = lastIndex + 1

  const fileWrites: Promise<void>[] = []

  const bb = Busboy({
    headers: req.headers,
    limits: {
      files: 200, // adjust
      fileSize: MAX_FILE_SIZE, // hard stop per file
    },
  })

  req.pipe(bb)

  await new Promise<void>((resolve, reject) => {
    bb.on('field', (name: string, value: string) => {
      fields[name] = value
    })

    bb.on('file', async (fieldname: string, fileStream: Stream.Readable, info) => {
      if (fieldname !== 'files' && fieldname !== 'file') {
        fileStream.resume()
        return
      }

      const originalName = info?.filename || 'unknown'
      const mime = String(info?.mimeType || inferContentType(originalName))

      const ext = path.extname(originalName).toLowerCase()

      if (!isAllowedFile(originalName, mime)) {
        failed.push({
          filename: originalName,
          error: `Invalid file type: ${mime}. Allowed: jpg/png/webp/avif/gif, mp4/mov/webm`,
        })
        fileStream.resume()
        return
      }

      const kind = inferKind(mime)
      const assetIndex = String(nextAssetIndex++).padStart(4, '0')
      const versionIndex = '001'

      const semanticId = `${kind}-${projectIndex}-${assetIndex}-${versionIndex}`
      const semanticFilename = `${semanticId}${ext}`

      // Store under: <mediaDir>/source/<semanticFilename>
      const projectBaseAbs = path.join(mediaDir, 'source')
      const absPath = path.join(projectBaseAbs, semanticFilename)

      const webStream = Readable.toWeb(fileStream) as ReadableStream<Uint8Array>

      const [diskStream, r2Stream] = webStream.tee()

      const filewrite = diskPutFileStream(absPath, diskStream)
        .then(async () => {
          console.info('💾 Media Saved to FS cache', { cacheKey: absPath })
          const metaData = await fs.getMeta(path.join('source', semanticFilename))

          return metaData
        })
        .then(async (metaData) => {
          await r2PutFileStream(path.join('source', semanticFilename), r2Stream, metaData.size as number, {
            endpoint: import.meta.env.NUXT_PRIVATE_CLOUDREVE_R2_ENDPOINT!,
            bucket: import.meta.env.NUXT_PRIVATE_CLOUDREVE_R2_BUCKET!,
          })
            .then(() => {
              console.info('💾 Media Saved to R2 cache', { cacheKey: absPath, byteLength: metaData.size })
            })
            .catch((error) => {
              console.error('Failed to save to cache:', error)
            })

          savedFiles.push({
            slug: semanticId,
            originalName: '',
            mime: '',
            relPath: absPath,
            size: metaData.size as number,
          })
        })

      fileWrites.push(filewrite)
    })

    bb.on('error', reject)
    bb.on('finish', async () => {
      try {
        await Promise.all(fileWrites)
        resolve()
      } catch (e) {
        reject(e)
      }
    })
  })

  // Kick off processing AFTER upload completes (don’t block response on transcodes/Notion writes).
  event.waitUntil(
    (async () => {
      for (const { slug, relPath } of savedFiles) {
        try {
          const metaData = `${mime.lookup(slug)}`.includes('image') ? await getImageMetadata(relPath) : await getVideoMetadata(relPath)

          const originalWidth = !('stream' in metaData) ? metaData.format.width : metaData.stream.width!
          const originalHeight = !('stream' in metaData) ? metaData.format.height : metaData.stream.height!

          const resolutionLabel = getResolution(originalWidth, originalHeight)
          const aspectRatioLabel = getAspectRatio(originalWidth, originalHeight)
          const [aW, aH] = aspectRatioLabel.split(':').flatMap((item) => parseInt(item))
          const aspectRatio = aW / aH

          const { width: coverWidth, height: coverHeight } = calculateDimension(1080, aspectRatio)

          let updateCoverURL = `${config.public.siteUrl}/media/image/s_${coverWidth}x${coverHeight}/${slug}`
          await $fetch(updateCoverURL, { method: 'HEAD' })

          updateCoverURL = `${config.public.siteUrl}/media/image/s_${coverWidth}x${coverHeight}/${slug}`

          await notion.pages.create({
            parent: {
              database_id: notionDbId.asset,
            },
            cover: {
              type: 'external',
              external: { url: updateCoverURL },
            },
            properties: {
              Project: {
                type: 'relation',
                relation: projectId
                  ? [
                      {
                        id: projectId,
                      },
                    ]
                  : [],
              },
              Index: {
                type: 'number',
                number: parseInt(slug.split('-')[2]),
              },
              'Version Index': {
                type: 'number',
                number: parseInt(slug.split('-')[3]),
              },
              Name: {
                type: 'title',
                title: [
                  {
                    type: 'text',
                    text: {
                      content: slug,
                    },
                  },
                ],
              },
              Type: {
                type: 'select',
                select: {
                  name: slug.split('-')[0] === 'photo' ? 'Photo' : 'Video',
                },
              },
              Status: {
                type: 'status',
                status: {
                  name: 'Plan',
                },
              },
              Resolution: {
                type: 'select',
                select: {
                  name: resolutionLabel,
                },
              },
              'Aspect ratio': {
                select: {
                  name: `${aW}:${aH}`,
                },
              },
              ...(metaData && {
                Additional: {
                  rich_text: [{ text: { content: `${JSON.stringify({ duration: metaData.format.duration })}` } }],
                },
              }),
            },
          })

          console.log('⚒️ Creating', { slug, updateCoverURL })
        } catch (e) {
          console.log('🚩 Failed Creating', { slug }, e)
        }
      }
    })()
  )

  const allOk = failed.length === 0
  const someOk = successful.length > 0

  if (allOk) {
    setResponseStatus(event, 200)
    return { success: true, files: successful }
  }

  if (someOk) {
    setResponseStatus(event, 207)
    return { success: true, files: successful, errors: failed }
  }

  setResponseStatus(event, 400)
  return { success: false, errors: failed }
})
