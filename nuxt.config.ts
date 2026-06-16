import tailwindcss from "@tailwindcss/vite"

export default defineNuxtConfig({
  compatibilityDate: "2026-05-02",
  devtools: { enabled: false },
  css: ["~/assets/css/main.css"],
  modules: ["@pinia/nuxt", "@nuxtjs/color-mode"],
  routeRules: {
    "/": { ssr: false },
    "/editor": { ssr: false },
    "/blog/**": { ssr: false },
    "/q/*": { ssr: false }
  },
  colorMode: {
    classSuffix: "",
    preference: "system",
    fallback: "light",
    storage: "localStorage",
    storageKey: "color-mode"
  },

  components: [
    {
      path: "~/components",
      pathPrefix: true
    },
    {
      path: "~/components/icons",
      pathPrefix: false
    }
  ],

  nitro: {
    preset: "netlify"
    // Netlify Functions 默认 10s 超时，作为服务端兜底
    // 客户端超时由 app/composables/useApi.ts 统一管理（10s）
    // server/api/proxy/md.get.ts 对外部请求有独立的 AbortController 超时
  },

  app: {
    head: {
      title: "非常不愉快",
      script: [
        {
          innerHTML: `
(function () {
  try {
    const theme = localStorage.getItem('color-mode');

    if (
      theme === 'dark' ||
      (
        !theme &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
      )
    ) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
        `,
          tagPosition: "head"
        }
      ],
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" }
      ],
      link: [{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }]
    }
  },

  // 运行时配置 - 从环境变量读取
  runtimeConfig: {
    mongodbUri: "",
    mongodbCollection: "configs",
    adminUsername: "",
    adminPassword: ""
  },

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ["dompurify"]
    }
  }
})
