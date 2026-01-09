<script setup lang="ts">
defineProps<{
  media: {
    slug: string
    name: string
    type: string
    size: number
    image: string
  }
}>()

const img = ref<HTMLImageElement | null>(null)
const aspect = ref<string | null>(null)

/* const mediaFormatedSize = computed(() => {
  if (!props.media.size) return '?'
  if (props.media.size > 1e9) return (props.media.size / 1e9).toFixed(2) + ' GB'
  if (props.media.size > 1e6) return (props.media.size / 1e6).toFixed(2) + ' MB'
  if (props.media.size > 1e3) return (props.media.size / 1e3).toFixed(2) + ' KB'
  return props.media.size + ' B'
})

const mediaBaseName = computed(() => {
  const n = props.media.name || ''
  const i = n.lastIndexOf('.')
  return i > 0 ? n.slice(0, i) : n
})

const mediaExt = ''

const mediaIcon = computed(() => {
  switch (props.media.type) {
    case 'image':
      return 'lucide:file-image'
    case 'video':
      return 'lucide:file-video'
    case 'audio':
      return 'lucide:file-music'
    default:
      return 'lucide:file-text'
  }
}) */

onMounted(() => {
  if (img.value && img.value.complete) {
    aspect.value = img.value.naturalWidth && img.value.naturalHeight ? `${img.value.naturalWidth}:${img.value.naturalHeight}` : null
  }
})
</script>

<template>
  <div
    class="relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition hover:shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
    style="min-width: 180px">
    <div class="relative aspect-square w-full overflow-hidden">
      <img ref="img" :src="media.image!" class="h-full w-full object-contain" alt="thumbnail" />
    </div>
  </div>
</template>
