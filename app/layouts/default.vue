<script setup lang="ts"></script>

<template>
  <UiSidebarProvider>
    <UiSidebar>
      <UiSidebarHeader>
        <UiSidebarMenu>
          <UiSidebarMenuItem>
            <UiSidebarMenuButton size="lg">
              <div class="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <!-- <UiGalleryVerticalEnd class="size-4" /> -->
              </div>
              <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate font-semibold">UnMedia</span>
              </div>
            </UiSidebarMenuButton>
          </UiSidebarMenuItem>
        </UiSidebarMenu>
      </UiSidebarHeader>
      <UiSidebarContent>
        <UiSidebarGroup>
          <UiSidebarGroupLabel>Platform</UiSidebarGroupLabel>
          <UiSidebarGroupContent>
            <UiSidebarMenu>
              <UiSidebarMenuItem>
                <UiSidebarMenuButton as-child>
                  <NuxtLink to="/asset">
                    <span>Assets</span>
                  </NuxtLink>
                </UiSidebarMenuButton>
                <UiSidebarMenuButton as-child>
                  <NuxtLink to="/image">
                    <span>Image</span>
                  </NuxtLink>
                </UiSidebarMenuButton>
                <UiSidebarMenuButton as-child>
                  <NuxtLink to="/video">
                    <span>Video</span>
                  </NuxtLink>
                </UiSidebarMenuButton>
              </UiSidebarMenuItem>
            </UiSidebarMenu>
          </UiSidebarGroupContent>
          <UiSidebarGroupLabel>Assets</UiSidebarGroupLabel>
          <UiSidebarGroupContent>
            <UiSidebarMenu>
              <UiSidebarMenuItem>
                <UiSidebarMenuButton as-child>
                  <NuxtLink to="/asset">
                    <span>Assets</span>
                  </NuxtLink>
                </UiSidebarMenuButton>
              </UiSidebarMenuItem>
            </UiSidebarMenu>
          </UiSidebarGroupContent>
        </UiSidebarGroup>
      </UiSidebarContent>
      <UiSidebarFooter />
      <UiSidebarRail />
    </UiSidebar>
    <UiSidebarInset>
      <header class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div class="flex w-full items-center gap-2 px-4">
          <UiSidebarTrigger class="-ml-1" />
          <!-- Upload dialog -->
          <UiDialog>
            <UiDialogTrigger as-child>
              <UiButton variant="outline" class="ml-auto gap-2">
                <svg viewBox="0 0 24 24" class="h-4 w-4 fill-current" aria-hidden="true">
                  <path d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.42L11 12.59V4a1 1 0 0 1 1-1z" />
                  <path d="M4 19a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1z" />
                </svg>
                Upload
              </UiButton>
            </UiDialogTrigger>

            <UiDialogContent class="max-w-2xl p-0 [&>button:last-child]:top-3.5">
              <UiDialogHeader class="contents space-y-0 text-left">
                <UiDialogTitle class="border-b px-6 py-4 text-base"> Upload Files </UiDialogTitle>
              </UiDialogHeader>

              <div class="px-6 py-4">
                <!-- Replace with your real uploader -->
                <UploadSection />
              </div>
            </UiDialogContent>
          </UiDialog>
          <!-- Upload dialog -->
        </div>
      </header>
      <slot />
    </UiSidebarInset>
  </UiSidebarProvider>
</template>
