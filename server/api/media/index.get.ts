import { syncDrive } from '~~/server/routes/media/[kind]/[...rest]'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig().private
  const data = await syncDrive()

  return Object.entries(data)
    .filter(([key, value]) => value.includes('uploads/1/media/') && !value.includes('uploads/1/media/archive') && (key.startsWith('photo-') || key.startsWith('video-')))
    .map<{ slug: string; name: string; image: string; type: 'image' | 'video'; size: number }>(([key, value]) => ({
      slug: key,
      name: key,
      image: `${config.cloudreveR2PublicUrl}/${value}._thumb`,
      type: key.startsWith('photo-') ? 'image' : 'video',
      size: 0,
    }))
})
