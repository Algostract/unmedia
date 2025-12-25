<script setup lang="ts">
// type MediaFile = {
//   id: string
//   name: string
//   path: string
//   type: 'image' | 'video'
// }

type AssetSidebarItem = {
  title: string
  key: 'details' | 'preview' | 'metadata'
}

definePageMeta({
  // middleware: ['auth'],
  // layout: 'dashboard'
})

useSeoMeta({ title: 'Assets' })

// const route = useRoute()
// const router = useRouter()

const assetId = ref(null) // computed(() => (route.query.asset ? String(route.query.asset) : null))
// const folderPath = computed(() => (route.query.folder ? String(route.query.folder) : null))

const uploadDialogOpen = ref(false)
const assetSidebarOpen = computed(() => !!assetId.value)

// local UI state
const activeDetailsTab = ref<AssetSidebarItem['key']>('details')

const assetSidebarItems: AssetSidebarItem[] = [
  { title: 'Details', key: 'details' },
  { title: 'Preview', key: 'preview' },
  { title: 'Metadata', key: 'metadata' },
]

// function setQueryParam(key: 'asset' | 'folder', value: string | null) {
//   const q = { ...route.query } as Record<string, any>
//   if (!value) delete q[key]
//   else q[key] = value
//   router.replace({ query: q })
// }

// function handleMediaSelect(media: MediaFile) {
//   setQueryParam('asset', media.id)
// }

function clearAssetSelection() {
  assetId.value = null
}

// function clearFolder() {
//   setQueryParam('folder', null)
// }

// function setFolder(next: string) {
//   setQueryParam('folder', next)
// }

function openUploadDialog() {
  uploadDialogOpen.value = true
}

const { data: media } = await useFetch('/api/media')
</script>

<template>
  <div class="h-[calc(100vh-56px)] lg:h-[calc(100vh-56px)]">
    <div class="h-full">
      <!-- Split view (main + details) -->
      <UiResizablePanelGroup direction="horizontal" class="h-full">
        <!-- Main panel -->
        <UiResizablePanel :default-size="assetSidebarOpen ? 70 : 100" :min-size="30">
          <!-- Main content -->
          <div class="h-[calc(100vh-64px-56px)] overflow-auto px-4 sm:px-6">
            <!-- @select="handleMediaSelect" @set-folder="setFolder"-->
            <MediaGrid
              v-if="media"
              :media="media"
              :selected-asset-id="assetId"
              @select="
                (slug) => {
                  assetId = slug
                  activeDetailsTab = 'details'
                  console.log({})
                }
              "
              @upload="openUploadDialog" />
          </div>
        </UiResizablePanel>

        <!-- Details sidebar panel -->
        <template v-if="assetSidebarOpen">
          <UiResizableHandle with-handle />

          <UiResizablePanel :default-size="30" :min-size="25" :max-size="50" collapsible>
            <aside class="bg-background flex h-full flex-col border-l">
              <div class="flex items-center justify-between border-b px-4 py-3">
                <div class="min-w-0">
                  <p class="text-muted-foreground text-xs">Selected asset</p>
                  <p class="truncate text-sm font-medium">{{ assetId }}</p>
                </div>
                <UiButton variant="ghost" size="icon" @click="clearAssetSelection">
                  <span class="sr-only">Close</span>
                  <svg viewBox="0 0 24 24" class="h-5 w-5 fill-current" aria-hidden="true">
                    <path
                      d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 1 0 1.42 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.42L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4z" />
                  </svg>
                </UiButton>
              </div>

              <nav class="border-b p-2">
                <div class="grid grid-cols-3 gap-1">
                  <UiButton
                    v-for="it in assetSidebarItems"
                    :key="it.key"
                    variant="ghost"
                    class="h-9 justify-center"
                    :class="activeDetailsTab === it.key ? 'bg-muted' : ''"
                    @click="activeDetailsTab = it.key">
                    {{ it.title }}
                  </UiButton>
                </div>
              </nav>

              <div class="flex-1 overflow-auto p-4">
                <!-- Replace with your real details sidebar implementation -->
                <AssetDetails :asset-id="assetId!" :tab="activeDetailsTab" />
              </div>
            </aside>
          </UiResizablePanel>
        </template>
      </UiResizablePanelGroup>
    </div>
  </div>
</template>
