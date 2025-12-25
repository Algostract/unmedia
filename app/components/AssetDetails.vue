<script setup lang="ts">
defineProps<{
  assetId: string
  tab: 'details' | 'preview' | 'metadata'
}>()
</script>

<template>
  <div class="space-y-2">
    <p class="text-sm font-medium">Asset details</p>
    <p class="text-muted-foreground text-sm">Asset: {{ assetId }}</p>
    <p class="text-muted-foreground text-sm">Tab: {{ tab }}</p>
  </div>
</template>
