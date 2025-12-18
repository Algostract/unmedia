import { syncDrive } from '~~/server/routes/media/[kind]/[...rest]'

export default defineEventHandler(async () => {
  const data = await syncDrive()

  const filteredKeys = Object.entries(data)
    .filter(([key, value]) => value.includes('uploads/1/media/') && !value.includes('uploads/1/media/archive') && (key.startsWith('photo-') || key.startsWith('video-')))
    .map(([key]) => key)

  return filteredKeys
})
