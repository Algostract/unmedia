<script setup lang="ts">
type MediaFile = { slug: string; name: string; type: 'image' | 'video'; size: number; image: string }

defineProps<{
  media: MediaFile[]
  selectedAssetId: string | null
}>()

const emit = defineEmits<{
  (e: 'select', slug: string): void
}>()
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
      <ImageCard v-for="mediaItem in media" :key="mediaItem.slug" :media="mediaItem" @click="emit('select', mediaItem.slug)" />

      <!--  <button v-for="{ id, name, type } in media" :key="id"
        class="group bg-muted/20 relative overflow-hidden rounded-md border text-left" @click="emit('select', id)">
        <div class="aspect-square p-3">
          <p class="truncate text-sm font-medium">{{ name }}</p>
          <p class="text-muted-foreground mt-1 text-xs">{{ type }}</p>
        </div>

        <div v-if="selectedAssetId === id" class="ring-primary absolute inset-0 ring-2" />
      </button> -->
    </div>
  </div>
</template>
