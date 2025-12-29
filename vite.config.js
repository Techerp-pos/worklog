import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  base: "/",
  plugins: [
    react(),

    // 🔥 ADD PWA HERE
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt", "apple-touch-icon.png"],
      manifest: {
        id: "/",
        name: "WorkLog",
        short_name: "WorkLog",
        description: "WorkLog Employee Attendance Portal",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#C7F432",
        background_color: "#ffffff",

        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ],

        screenshots: [
          {
            src: "/screenshots/mobile-1.png",
            sizes: "1080x1920",
            type: "image/png"
          },
          {
            src: "/screenshots/mobile-2.png",
            sizes: "1080x1920",
            type: "image/png"
          },
          {
            src: "/screenshots/desktop-1.png",
            sizes: "1920x1080",
            type: "image/png",
            form_factor: "wide"
          }
        ]
      },
      workbox: {
        // 👇 Add this configuration
        maximumFileSizeToCacheInBytes: 5000000 // Sets the limit to 5 MB (5,000,000 bytes)
      }
    })

  ],

  server: {
    host: true,
  },

  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
