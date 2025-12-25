<script setup lang="ts">
/* const title = `UnFiles`
const description = `Universal file uploads with built‑in transforms and CDN delivery for any runtime.`

const {
  app: { buildTime },
  public: { siteUrl },
} = useRuntimeConfig() */

useHead({
  htmlAttrs: {
    lang: 'en',
  },
  link: [
    {
      rel: 'icon',
      type: 'image/x-icon',
      href: '/favicon.ico',
    },
  ],
})

useSeoMeta({
  ogType: 'profile',
  ogImageWidth: 1280,
  ogImageHeight: 640,
  fbAppId: 966242223397117,
  twitterCard: 'summary_large_image',
  colorScheme: 'light dark',
})

/* useSchemaOrg([
  defineWebPage({
    datePublished: new Date(2025, 10, 24).toISOString(),
    dateModified: buildTime,
    author: 'Shirsendu Bairagi',
  }),
  defineWebSite({
    url: siteUrl,
    name: title,
    description: description,
  }),
]) */
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtPwaAssets />
  <NuxtLoadingIndicator color="#0593FA" />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <LazyAppInstallPrompt hydrate-on-idle />
</template>

<style>
@reference "./assets/css/main.css";

* {
  -webkit-tap-highlight-color: transparent;
  scrollbar-width: 6px;
  @apply antialiased;
}

*::-webkit-scrollbar {
  @apply block size-[6px] bg-neutral-200 dark:bg-neutral-800;
}

*::-webkit-scrollbar-thumb {
  @apply rounded-md bg-neutral-400 dark:bg-neutral-600;
}

html {
  @apply relative overflow-x-hidden scroll-smooth;
}

body {
  @apply bg-background relative min-h-screen overflow-x-hidden fill-black text-black dark:fill-white dark:text-white;
}

svg.iconify--local {
  @apply !m-0 !box-content;
}

.scrollbar-hidden::-webkit-scrollbar {
  display: none;
}

.scrollbar-hidden::-webkit-scrollbar {
  width: 0;
  height: 0;
}
</style>
