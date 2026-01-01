import { createWriteStream } from 'node:fs'
import { Writable } from 'node:stream'
import z from 'zod'
import mime from 'mime-types'
import { syncDrive } from '~~/server/routes/media/[kind]/[...rest]'

export default defineEventHandler(async (event) => {
  try {
    const fs = useStorage('fs')
    const config = useRuntimeConfig()

    const { id } = await getValidatedRouterParams(
      event,
      z.object({
        id: z.string().min(1),
      }).parse
    )

    const mediaOriginId = (await syncDrive())[id]

    const mediaId = encodeURI(mediaOriginId).replaceAll('/', '_')
    const source = `./source/${mediaId}`
    // check if file already exists
    if (!(await fs.hasItem(source))) {
      const { stream } = await r2GetFileStream(encodeURI(mediaOriginId), 'origin', config.private.cloudreveR2Endpoint, config.private.cloudreveR2Bucket) // Web ReadableStream<Uint8Array>
      await stream.pipeTo(Writable.toWeb(createWriteStream(`./static/${source}`)))
    }

    const metaData = `${mime.lookup(mediaId)}`.includes('image') ? await getImageMetadata(`./static/${source}`) : await getVideoMetadata(`./static/${source}`)
    return metaData
  } catch (error) {
    console.error('API media/[id] GET', error)

    throw createError({
      statusCode: 500,
      statusMessage: 'Some Unknown Error Found',
    })
  }
})
