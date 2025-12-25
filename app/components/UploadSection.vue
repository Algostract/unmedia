<script setup lang="ts">
type UploadResult = {
  filename: string
  path: string
  size: number
  url: string
}

type UploadError = {
  filename: string
  error: string
}

type UploadResponse = {
  success: boolean
  files?: UploadResult[]
  errors?: UploadError[]
  error?: string
}

const emit = defineEmits<{
  (e: 'uploaded', result: UploadResponse): void
}>()

const uploading = ref(false)
const uploadResult = ref<UploadResponse | null>(null)
const selectedFiles = ref<File[]>([])

const fileInputRef = ref<HTMLInputElement | null>(null)
const folderInputRef = ref<HTMLInputElement | null>(null)

const isDragActive = ref(false)

const acceptAttr = '.jpg,.jpeg,.png,.webp,.avif,.gif,.mp4,.mov,.webm'

function formatFileSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function fileKind(file: File): 'image' | 'video' | 'other' {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  return 'other'
}

function setFiles(files: File[]) {
  selectedFiles.value = files
  uploadResult.value = null
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragActive.value = false
  const files = Array.from(e.dataTransfer?.files || [])
  if (files.length) setFiles(files)
}

function onFilePick(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  if (files.length) setFiles(files)
  // allow selecting the same file again
  input.value = ''
}

function onFolderPick(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  if (files.length) setFiles(files)
  input.value = ''
}

function openFiles() {
  fileInputRef.value?.click()
}

function openFolder() {
  folderInputRef.value?.click()
}

async function handleUpload() {
  if (!selectedFiles.value.length) return

  uploading.value = true
  uploadResult.value = null

  const formData = new FormData()
  for (const f of selectedFiles.value) formData.append('files', f)

  try {
    const res = await $fetch<UploadResponse>('/api/media', {
      query: {
        slug: 'contacts-competitor-test-shoot-49',
      },
      method: 'POST',
      body: formData,
      credentials: 'include',
    })
    uploadResult.value = res
    emit('uploaded', res)
    // optional: if you used useAsyncData('storage-tree') somewhere
    refreshNuxtData('storage-tree')
  } catch (err) {
    uploadResult.value = {
      success: false,
      error: err instanceof Error ? err.message : 'Upload failed',
    }
  } finally {
    uploading.value = false
  }
}

const dropzoneClass = computed(() => {
  return [
    'relative rounded-lg border-2 border-dashed p-12 text-center transition-all duration-200',
    'cursor-pointer select-none',
    isDragActive.value ? 'border-blue-500 bg-blue-50/50 dark:border-blue-400 dark:bg-blue-950/20' : 'border-border bg-muted/30 hover:border-muted-foreground/50',
  ].join(' ')
})
</script>

<template>
  <section class="flex-1">
    <div class="space-y-4">
      <!-- Hidden pickers -->
      <input ref="fileInputRef" type="file" multiple :accept="acceptAttr" class="hidden" @change="onFilePick" />

      <input ref="folderInputRef" type="file" multiple class="hidden" :accept="acceptAttr" webkitdirectory="" directory="" @change="onFolderPick" />

      <!-- Dropzone -->
      <div
        :class="dropzoneClass"
        role="button"
        tabindex="0"
        @click="openFiles"
        @keydown.enter.prevent="openFiles"
        @dragenter.prevent="isDragActive = true"
        @dragover.prevent="isDragActive = true"
        @dragleave.prevent="isDragActive = false"
        @drop="onDrop">
        <div class="flex flex-col items-center gap-4">
          <div class="grid size-12 place-items-center rounded-full border" :class="isDragActive ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'">
            <svg viewBox="0 0 24 24" class="h-6 w-6 fill-current" aria-hidden="true">
              <path d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.42L11 12.59V4a1 1 0 0 1 1-1z" />
              <path d="M4 19a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1z" />
            </svg>
          </div>

          <template v-if="isDragActive">
            <p class="text-lg font-medium text-blue-600 dark:text-blue-400">Drop files here…</p>
          </template>

          <template v-else>
            <div>
              <p class="text-lg font-medium">Drop files here, or click to select files</p>
              <p class="text-muted-foreground mt-1 text-sm">Supports: JPG, PNG, WebP, AVIF, GIF, MP4, MOV, WebM</p>
            </div>

            <div class="mt-2 flex gap-2">
              <UiButton variant="outline" size="sm" class="gap-2" @click.stop="openFolder">
                <svg viewBox="0 0 24 24" class="h-4 w-4 fill-current" aria-hidden="true">
                  <path d="M10 4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6z" />
                </svg>
                Select Folder
              </UiButton>
            </div>
          </template>
        </div>
      </div>

      <!-- Selected Files Preview -->
      <div v-if="selectedFiles.length" class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">{{ selectedFiles.length }} file(s) selected</h3>

          <UiButton class="gap-2" :disabled="uploading" @click="handleUpload">
            <template v-if="uploading">
              <UiSpinner class="text-background" :size="16" />
              Uploading...
            </template>
            <template v-else>
              <span>Upload Files</span>
            </template>
          </UiButton>
        </div>

        <div class="max-h-64 divide-y overflow-y-auto rounded-lg border">
          <div v-for="(file, idx) in selectedFiles.slice(0, 50)" :key="`${file.name}-${idx}`" class="bg-card hover:bg-muted/50 flex items-center gap-3 px-4 py-3">
            <span class="inline-block size-2 rounded-full" :class="fileKind(file) === 'image' ? 'bg-blue-500' : fileKind(file) === 'video' ? 'bg-purple-500' : 'bg-muted-foreground'" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">
                {{ (file as any).webkitRelativePath || file.name }}
              </p>
              <p class="text-muted-foreground text-xs">{{ formatFileSize(file.size) }}</p>
            </div>
          </div>

          <div v-if="selectedFiles.length > 50" class="text-muted-foreground px-4 py-3 text-center text-sm">... and {{ selectedFiles.length - 50 }} more files</div>
        </div>
      </div>

      <!-- Upload Results -->
      <div v-if="uploadResult" class="space-y-4">
        <div v-if="uploadResult.success && uploadResult.files?.length" class="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20">
          <div class="mb-3 flex items-center gap-2">
            <div class="grid size-6 place-items-center rounded-full bg-green-600/10 text-green-700 dark:text-green-300">
              <svg viewBox="0 0 24 24" class="h-4 w-4 fill-current" aria-hidden="true">
                <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
              </svg>
            </div>
            <h3 class="font-semibold text-green-900 dark:text-green-100">Successfully uploaded {{ uploadResult.files.length }} file(s)</h3>
          </div>

          <div class="max-h-64 space-y-2 overflow-y-auto">
            <div v-for="(f, idx) in uploadResult.files" :key="`${f.path}-${idx}`" class="bg-card flex items-center justify-between rounded border border-green-100 p-3 dark:border-green-900/50">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium">{{ f.path }}</p>
                <p class="text-muted-foreground text-xs">{{ formatFileSize(f.size) }}</p>
              </div>

              <a
                class="ml-4 text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                :href="`${$config.public.siteUrl}/${f.url}`"
                target="_blank"
                rel="noopener noreferrer">
                View
              </a>
            </div>
          </div>
        </div>

        <div v-if="uploadResult.errors?.length" class="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
          <div class="mb-3 flex items-center gap-2">
            <div class="grid size-6 place-items-center rounded-full bg-red-600/10 text-red-700 dark:text-red-300">
              <svg viewBox="0 0 24 24" class="h-4 w-4 fill-current" aria-hidden="true">
                <path d="M12 10.6 7.1 5.7 5.7 7.1 10.6 12l-4.9 4.9 1.4 1.4 4.9-4.9 4.9 4.9 1.4-1.4L13.4 12l4.9-4.9-1.4-1.4-4.9 4.9Z" />
              </svg>
            </div>
            <h3 class="font-semibold text-red-900 dark:text-red-100">{{ uploadResult.errors.length }} file(s) failed</h3>
          </div>

          <div class="max-h-64 space-y-2 overflow-y-auto">
            <div v-for="(e, idx) in uploadResult.errors" :key="`${e.filename}-${idx}`" class="bg-card rounded border border-red-100 p-3 dark:border-red-900/50">
              <p class="text-sm font-medium text-red-900 dark:text-red-100">{{ e.filename }}</p>
              <p class="mt-1 text-xs text-red-700 dark:text-red-300">{{ e.error }}</p>
            </div>
          </div>
        </div>

        <div v-if="uploadResult.error && !uploadResult.success" class="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
          <p class="font-semibold text-red-900 dark:text-red-100">Upload failed</p>
          <p class="mt-2 text-sm text-red-700 dark:text-red-300">{{ uploadResult.error }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
