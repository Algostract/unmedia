import mime from 'mime-types'
import { createWriteStream } from 'node:fs'
import { Writable } from 'node:stream'

export default async function (payload: Record<string, string>): Promise<{
  streamPath: string
  contentType: string
  byteLength: number
}> {
  const cacheKey = payload.cacheKey as unknown as string
  const mediaOriginId = payload.mediaOriginId as unknown as string
  const modifiers = payload.modifiers as unknown as Record<string, string | number | boolean>
  const cachePath = `./static/cache/video`
  const fs = useStorage('fs')
  const config = useRuntimeConfig()

  const source = `source/${encodeURI(mediaOriginId).replaceAll('/', '_')}`
  await ensureDir('./static/source')
  // consola.log('🛠️ Transform START', { source, modifiers })

  // check if file already exists
  if (!(await fs.hasItem(source))) {
    const { stream } = await r2GetFileStream(encodeURI(mediaOriginId), 'origin', config.private.cloudreveR2Endpoint, config.private.cloudreveR2Bucket) // Web ReadableStream<Uint8Array>
    await stream.pipeTo(Writable.toWeb(createWriteStream(`./static/${source}`)))
  }

  await transcodeVideo(`./static/${source}`, cachePath)

  // await transcodeVideo(
  //   `./static/${source}`,
  //   cachePath,
  //   mediaId,
  //   generateResolutions(
  //     '16:9',
  //     (modifiers.resize as string).split('-').map((item) => parseInt(item))
  //   ),
  //   (modifiers.codec as string).split('-') as ['avc' | 'vp9' | 'hevc' | 'av1'],
  //   modifiers.quality as number,
  //   'cpu',
  //   4,
  //   (info) => {
  //     console.info(info)
  //   }
  // )
  const metaData = await fs.getMeta(cacheKey)
  const byteLength = metaData.size as number

  const contentType = (typeof modifiers.format === 'string' && (mime.contentType(modifiers.format) || undefined)) || 'application/octet-stream'

  return {
    streamPath: cachePath,
    byteLength,
    contentType,
  }
}
