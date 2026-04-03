// vite.config.ts
import { defineConfig } from "file:///Users/macbookpro/Downloads/breneoapp/node_modules/vite/dist/node/index.js";
import react from "file:///Users/macbookpro/Downloads/breneoapp/node_modules/@vitejs/plugin-react-swc/index.mjs";
import path from "path";
import fs from "fs";
import { componentTagger } from "file:///Users/macbookpro/Downloads/breneoapp/node_modules/lovable-tagger/dist/index.js";
import { VitePWA } from "file:///Users/macbookpro/Downloads/breneoapp/node_modules/vite-plugin-pwa/dist/index.js";
var __vite_injected_original_dirname = "/Users/macbookpro/Downloads/breneoapp";
var packageJson = JSON.parse(
  fs.readFileSync(path.resolve(__vite_injected_original_dirname, "package.json"), "utf-8")
);
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // ⚠️ TEMPORARY WORKAROUND: Proxy API requests through frontend (development only)
    // This bypasses CORS but is NOT a production solution
    proxy: mode === "development" ? {
      // Employer job post → local proxy (secret key never in browser). Run `npm run dev` (starts proxy on 8787).
      "/api/employer/jobs": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true
      },
      "/api/job-details": {
        target: "https://breneo-job-aggregator.up.railway.app/",
        changeOrigin: true,
        secure: false,
        rewrite: (path2) => path2
        // Keep the path as-is
      },
      // Proxy all other /api requests to breneo.onrender.com
      "/api": {
        target: "https://breneo.onrender.com",
        changeOrigin: true,
        secure: true,
        configure: (proxy, options) => {
          proxy.on("proxyReq", (proxyReq, req, res) => {
            proxyReq.setHeader("Origin", req.headers.origin || "");
          });
        }
      }
    } : {}
  },
  base: "/",
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["robots.txt", "lovable-uploads/*.png"],
      manifest: {
        name: "Breneo - AI-Powered Learning & Job Matching Platform",
        short_name: "Breneo",
        description: "Breneo helps users assess their skills, explore job offers, and follow personalized learning paths with AI technology.",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/lovable-uploads/breneo-favicon.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/lovable-uploads/breneo-favicon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ],
        categories: ["education", "productivity", "business"],
        shortcuts: [
          {
            name: "Dashboard",
            short_name: "Dashboard",
            description: "View your dashboard",
            url: "/dashboard",
            icons: [
              {
                src: "/lovable-uploads/breneo-favicon.png",
                sizes: "96x96"
              }
            ]
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,woff,woff2,ttf}"],
        globIgnores: [
          "**/favicon.ico",
          "**/lovable-uploads/academy.png",
          "**/lovable-uploads/future.png",
          "**/lovable-uploads/way.png",
          "**/lovable-uploads/full-shot-student-library.jpg"
        ],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // 5 MB
        // Handle SPA routing - fallback to index.html for navigation requests
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [
          // Don't fallback for API routes
          /^\/api\/.*/,
          // Don't fallback for static assets
          /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|eot)$/
        ],
        // Skip waiting and claim clients for faster updates
        skipWaiting: true,
        clientsClaim: true,
        // Don't precache routes - handle them at runtime
        dontCacheBustURLsMatching: /\.\w{8}\./,
        runtimeCaching: [
          {
            // Handle navigation requests (SPA routes)
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "pages-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24
                // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30
                // 30 days
              }
            }
          },
          {
            // Handle manifest.webmanifest requests
            urlPattern: /manifest\.webmanifest$/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "manifest-cache",
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 60 * 60 * 24
                // 24 hours
              }
            }
          },
          {
            urlPattern: /^https:\/\/breneo\.onrender\.com\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24
                // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24
                // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: "module"
      },
      // Additional options to handle missing routes gracefully
      injectRegister: "auto"
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version || "0.0.0")
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvbWFjYm9va3Byby9Eb3dubG9hZHMvYnJlbmVvYXBwXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvbWFjYm9va3Byby9Eb3dubG9hZHMvYnJlbmVvYXBwL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9tYWNib29rcHJvL0Rvd25sb2Fkcy9icmVuZW9hcHAvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgZnMgZnJvbSBcImZzXCI7XG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tIFwidml0ZS1wbHVnaW4tcHdhXCI7XG5cbmNvbnN0IHBhY2thZ2VKc29uID0gSlNPTi5wYXJzZShcbiAgZnMucmVhZEZpbGVTeW5jKHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwicGFja2FnZS5qc29uXCIpLCBcInV0Zi04XCIpLFxuKSBhcyB7IHZlcnNpb24/OiBzdHJpbmcgfTtcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+ICh7XG4gIHNlcnZlcjoge1xuICAgIGhvc3Q6IFwiOjpcIixcbiAgICBwb3J0OiA4MDgwLFxuICAgIC8vIFx1MjZBMFx1RkUwRiBURU1QT1JBUlkgV09SS0FST1VORDogUHJveHkgQVBJIHJlcXVlc3RzIHRocm91Z2ggZnJvbnRlbmQgKGRldmVsb3BtZW50IG9ubHkpXG4gICAgLy8gVGhpcyBieXBhc3NlcyBDT1JTIGJ1dCBpcyBOT1QgYSBwcm9kdWN0aW9uIHNvbHV0aW9uXG4gICAgcHJveHk6XG4gICAgICBtb2RlID09PSBcImRldmVsb3BtZW50XCJcbiAgICAgICAgPyB7XG4gICAgICAgICAgICAvLyBFbXBsb3llciBqb2IgcG9zdCBcdTIxOTIgbG9jYWwgcHJveHkgKHNlY3JldCBrZXkgbmV2ZXIgaW4gYnJvd3NlcikuIFJ1biBgbnBtIHJ1biBkZXZgIChzdGFydHMgcHJveHkgb24gODc4NykuXG4gICAgICAgICAgICBcIi9hcGkvZW1wbG95ZXIvam9ic1wiOiB7XG4gICAgICAgICAgICAgIHRhcmdldDogXCJodHRwOi8vMTI3LjAuMC4xOjg3ODdcIixcbiAgICAgICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiL2FwaS9qb2ItZGV0YWlsc1wiOiB7XG4gICAgICAgICAgICAgIHRhcmdldDogXCJodHRwczovL2JyZW5lby1qb2ItYWdncmVnYXRvci51cC5yYWlsd2F5LmFwcC9cIixcbiAgICAgICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aCwgLy8gS2VlcCB0aGUgcGF0aCBhcy1pc1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIC8vIFByb3h5IGFsbCBvdGhlciAvYXBpIHJlcXVlc3RzIHRvIGJyZW5lby5vbnJlbmRlci5jb21cbiAgICAgICAgICAgIFwiL2FwaVwiOiB7XG4gICAgICAgICAgICAgIHRhcmdldDogXCJodHRwczovL2JyZW5lby5vbnJlbmRlci5jb21cIixcbiAgICAgICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgICAgICBzZWN1cmU6IHRydWUsXG4gICAgICAgICAgICAgIGNvbmZpZ3VyZTogKHByb3h5LCBvcHRpb25zKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIENPUlMgaGVhZGVycyB0byBwcm94aWVkIHJlcXVlc3RzXG4gICAgICAgICAgICAgICAgcHJveHkub24oXCJwcm94eVJlcVwiLCAocHJveHlSZXEsIHJlcSwgcmVzKSA9PiB7XG4gICAgICAgICAgICAgICAgICBwcm94eVJlcS5zZXRIZWFkZXIoXCJPcmlnaW5cIiwgcmVxLmhlYWRlcnMub3JpZ2luIHx8IFwiXCIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9XG4gICAgICAgIDoge30sXG4gIH0sXG4gIGJhc2U6IFwiL1wiLFxuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICBtb2RlID09PSBcImRldmVsb3BtZW50XCIgJiYgY29tcG9uZW50VGFnZ2VyKCksXG4gICAgVml0ZVBXQSh7XG4gICAgICByZWdpc3RlclR5cGU6IFwicHJvbXB0XCIsXG4gICAgICBpbmNsdWRlQXNzZXRzOiBbXCJyb2JvdHMudHh0XCIsIFwibG92YWJsZS11cGxvYWRzLyoucG5nXCJdLFxuICAgICAgbWFuaWZlc3Q6IHtcbiAgICAgICAgbmFtZTogXCJCcmVuZW8gLSBBSS1Qb3dlcmVkIExlYXJuaW5nICYgSm9iIE1hdGNoaW5nIFBsYXRmb3JtXCIsXG4gICAgICAgIHNob3J0X25hbWU6IFwiQnJlbmVvXCIsXG4gICAgICAgIGRlc2NyaXB0aW9uOlxuICAgICAgICAgIFwiQnJlbmVvIGhlbHBzIHVzZXJzIGFzc2VzcyB0aGVpciBza2lsbHMsIGV4cGxvcmUgam9iIG9mZmVycywgYW5kIGZvbGxvdyBwZXJzb25hbGl6ZWQgbGVhcm5pbmcgcGF0aHMgd2l0aCBBSSB0ZWNobm9sb2d5LlwiLFxuICAgICAgICB0aGVtZV9jb2xvcjogXCIjZmZmZmZmXCIsXG4gICAgICAgIGJhY2tncm91bmRfY29sb3I6IFwiI2ZmZmZmZlwiLFxuICAgICAgICBkaXNwbGF5OiBcInN0YW5kYWxvbmVcIixcbiAgICAgICAgb3JpZW50YXRpb246IFwicG9ydHJhaXRcIixcbiAgICAgICAgc2NvcGU6IFwiL1wiLFxuICAgICAgICBzdGFydF91cmw6IFwiL1wiLFxuICAgICAgICBpY29uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHNyYzogXCIvbG92YWJsZS11cGxvYWRzL2JyZW5lby1mYXZpY29uLnBuZ1wiLFxuICAgICAgICAgICAgc2l6ZXM6IFwiMTkyeDE5MlwiLFxuICAgICAgICAgICAgdHlwZTogXCJpbWFnZS9wbmdcIixcbiAgICAgICAgICAgIHB1cnBvc2U6IFwiYW55IG1hc2thYmxlXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBzcmM6IFwiL2xvdmFibGUtdXBsb2Fkcy9icmVuZW8tZmF2aWNvbi5wbmdcIixcbiAgICAgICAgICAgIHNpemVzOiBcIjUxMng1MTJcIixcbiAgICAgICAgICAgIHR5cGU6IFwiaW1hZ2UvcG5nXCIsXG4gICAgICAgICAgICBwdXJwb3NlOiBcImFueSBtYXNrYWJsZVwiLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICAgIGNhdGVnb3JpZXM6IFtcImVkdWNhdGlvblwiLCBcInByb2R1Y3Rpdml0eVwiLCBcImJ1c2luZXNzXCJdLFxuICAgICAgICBzaG9ydGN1dHM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBuYW1lOiBcIkRhc2hib2FyZFwiLFxuICAgICAgICAgICAgc2hvcnRfbmFtZTogXCJEYXNoYm9hcmRcIixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlZpZXcgeW91ciBkYXNoYm9hcmRcIixcbiAgICAgICAgICAgIHVybDogXCIvZGFzaGJvYXJkXCIsXG4gICAgICAgICAgICBpY29uczogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgc3JjOiBcIi9sb3ZhYmxlLXVwbG9hZHMvYnJlbmVvLWZhdmljb24ucG5nXCIsXG4gICAgICAgICAgICAgICAgc2l6ZXM6IFwiOTZ4OTZcIixcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICB3b3JrYm94OiB7XG4gICAgICAgIGdsb2JQYXR0ZXJuczogW1wiKiovKi57anMsY3NzLGh0bWwsc3ZnLHdvZmYsd29mZjIsdHRmfVwiXSxcbiAgICAgICAgZ2xvYklnbm9yZXM6IFtcbiAgICAgICAgICBcIioqL2Zhdmljb24uaWNvXCIsXG4gICAgICAgICAgXCIqKi9sb3ZhYmxlLXVwbG9hZHMvYWNhZGVteS5wbmdcIixcbiAgICAgICAgICBcIioqL2xvdmFibGUtdXBsb2Fkcy9mdXR1cmUucG5nXCIsXG4gICAgICAgICAgXCIqKi9sb3ZhYmxlLXVwbG9hZHMvd2F5LnBuZ1wiLFxuICAgICAgICAgIFwiKiovbG92YWJsZS11cGxvYWRzL2Z1bGwtc2hvdC1zdHVkZW50LWxpYnJhcnkuanBnXCIsXG4gICAgICAgIF0sXG4gICAgICAgIG1heGltdW1GaWxlU2l6ZVRvQ2FjaGVJbkJ5dGVzOiA1ICogMTAyNCAqIDEwMjQsIC8vIDUgTUJcbiAgICAgICAgLy8gSGFuZGxlIFNQQSByb3V0aW5nIC0gZmFsbGJhY2sgdG8gaW5kZXguaHRtbCBmb3IgbmF2aWdhdGlvbiByZXF1ZXN0c1xuICAgICAgICBuYXZpZ2F0ZUZhbGxiYWNrOiBcIi9pbmRleC5odG1sXCIsXG4gICAgICAgIG5hdmlnYXRlRmFsbGJhY2tEZW55bGlzdDogW1xuICAgICAgICAgIC8vIERvbid0IGZhbGxiYWNrIGZvciBBUEkgcm91dGVzXG4gICAgICAgICAgL15cXC9hcGlcXC8uKi8sXG4gICAgICAgICAgLy8gRG9uJ3QgZmFsbGJhY2sgZm9yIHN0YXRpYyBhc3NldHNcbiAgICAgICAgICAvXFwuKD86cG5nfGpwZ3xqcGVnfHN2Z3xnaWZ8d2VicHxpY298d29mZnx3b2ZmMnx0dGZ8ZW90KSQvLFxuICAgICAgICBdLFxuICAgICAgICAvLyBTa2lwIHdhaXRpbmcgYW5kIGNsYWltIGNsaWVudHMgZm9yIGZhc3RlciB1cGRhdGVzXG4gICAgICAgIHNraXBXYWl0aW5nOiB0cnVlLFxuICAgICAgICBjbGllbnRzQ2xhaW06IHRydWUsXG4gICAgICAgIC8vIERvbid0IHByZWNhY2hlIHJvdXRlcyAtIGhhbmRsZSB0aGVtIGF0IHJ1bnRpbWVcbiAgICAgICAgZG9udENhY2hlQnVzdFVSTHNNYXRjaGluZzogL1xcLlxcd3s4fVxcLi8sXG4gICAgICAgIHJ1bnRpbWVDYWNoaW5nOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgLy8gSGFuZGxlIG5hdmlnYXRpb24gcmVxdWVzdHMgKFNQQSByb3V0ZXMpXG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAoeyByZXF1ZXN0IH0pID0+IHJlcXVlc3QubW9kZSA9PT0gXCJuYXZpZ2F0ZVwiLFxuICAgICAgICAgICAgaGFuZGxlcjogXCJOZXR3b3JrRmlyc3RcIixcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgY2FjaGVOYW1lOiBcInBhZ2VzLWNhY2hlXCIsXG4gICAgICAgICAgICAgIGV4cGlyYXRpb246IHtcbiAgICAgICAgICAgICAgICBtYXhFbnRyaWVzOiA1MCxcbiAgICAgICAgICAgICAgICBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwICogMjQsIC8vIDI0IGhvdXJzXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNhY2hlYWJsZVJlc3BvbnNlOiB7XG4gICAgICAgICAgICAgICAgc3RhdHVzZXM6IFswLCAyMDBdLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHVybFBhdHRlcm46IC9cXC4oPzpwbmd8anBnfGpwZWd8c3ZnfGdpZnx3ZWJwKSQvaSxcbiAgICAgICAgICAgIGhhbmRsZXI6IFwiQ2FjaGVGaXJzdFwiLFxuICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICBjYWNoZU5hbWU6IFwiaW1hZ2VzLWNhY2hlXCIsXG4gICAgICAgICAgICAgIGV4cGlyYXRpb246IHtcbiAgICAgICAgICAgICAgICBtYXhFbnRyaWVzOiAxMDAsXG4gICAgICAgICAgICAgICAgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0ICogMzAsIC8vIDMwIGRheXNcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAvLyBIYW5kbGUgbWFuaWZlc3Qud2VibWFuaWZlc3QgcmVxdWVzdHNcbiAgICAgICAgICAgIHVybFBhdHRlcm46IC9tYW5pZmVzdFxcLndlYm1hbmlmZXN0JC9pLFxuICAgICAgICAgICAgaGFuZGxlcjogXCJOZXR3b3JrRmlyc3RcIixcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgY2FjaGVOYW1lOiBcIm1hbmlmZXN0LWNhY2hlXCIsXG4gICAgICAgICAgICAgIGV4cGlyYXRpb246IHtcbiAgICAgICAgICAgICAgICBtYXhFbnRyaWVzOiAxLFxuICAgICAgICAgICAgICAgIG1heEFnZVNlY29uZHM6IDYwICogNjAgKiAyNCwgLy8gMjQgaG91cnNcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXmh0dHBzOlxcL1xcL2JyZW5lb1xcLm9ucmVuZGVyXFwuY29tXFwvLiovaSxcbiAgICAgICAgICAgIGhhbmRsZXI6IFwiTmV0d29ya0ZpcnN0XCIsXG4gICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgIGNhY2hlTmFtZTogXCJhcGktY2FjaGVcIixcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjoge1xuICAgICAgICAgICAgICAgIG1heEVudHJpZXM6IDUwLFxuICAgICAgICAgICAgICAgIG1heEFnZVNlY29uZHM6IDYwICogNjAgKiAyNCwgLy8gMjQgaG91cnNcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY2FjaGVhYmxlUmVzcG9uc2U6IHtcbiAgICAgICAgICAgICAgICBzdGF0dXNlczogWzAsIDIwMF0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgdXJsUGF0dGVybjogL15odHRwczpcXC9cXC8uKlxcLnN1cGFiYXNlXFwuY29cXC8uKi9pLFxuICAgICAgICAgICAgaGFuZGxlcjogXCJOZXR3b3JrRmlyc3RcIixcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgY2FjaGVOYW1lOiBcInN1cGFiYXNlLWNhY2hlXCIsXG4gICAgICAgICAgICAgIGV4cGlyYXRpb246IHtcbiAgICAgICAgICAgICAgICBtYXhFbnRyaWVzOiA1MCxcbiAgICAgICAgICAgICAgICBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwICogMjQsIC8vIDI0IGhvdXJzXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNhY2hlYWJsZVJlc3BvbnNlOiB7XG4gICAgICAgICAgICAgICAgc3RhdHVzZXM6IFswLCAyMDBdLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIGRldk9wdGlvbnM6IHtcbiAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgdHlwZTogXCJtb2R1bGVcIixcbiAgICAgIH0sXG4gICAgICAvLyBBZGRpdGlvbmFsIG9wdGlvbnMgdG8gaGFuZGxlIG1pc3Npbmcgcm91dGVzIGdyYWNlZnVsbHlcbiAgICAgIGluamVjdFJlZ2lzdGVyOiBcImF1dG9cIixcbiAgICB9KSxcbiAgXS5maWx0ZXIoQm9vbGVhbiksXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgfSxcbiAgfSxcbiAgZGVmaW5lOiB7XG4gICAgX19BUFBfVkVSU0lPTl9fOiBKU09OLnN0cmluZ2lmeShwYWNrYWdlSnNvbi52ZXJzaW9uIHx8IFwiMC4wLjBcIiksXG4gIH0sXG59KSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQWlTLFNBQVMsb0JBQW9CO0FBQzlULE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsT0FBTyxRQUFRO0FBQ2YsU0FBUyx1QkFBdUI7QUFDaEMsU0FBUyxlQUFlO0FBTHhCLElBQU0sbUNBQW1DO0FBT3pDLElBQU0sY0FBYyxLQUFLO0FBQUEsRUFDdkIsR0FBRyxhQUFhLEtBQUssUUFBUSxrQ0FBVyxjQUFjLEdBQUcsT0FBTztBQUNsRTtBQUdBLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxPQUFPO0FBQUEsRUFDekMsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBO0FBQUE7QUFBQSxJQUdOLE9BQ0UsU0FBUyxnQkFDTDtBQUFBO0FBQUEsTUFFRSxzQkFBc0I7QUFBQSxRQUNwQixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsTUFDaEI7QUFBQSxNQUNBLG9CQUFvQjtBQUFBLFFBQ2xCLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFFBQVE7QUFBQSxRQUNSLFNBQVMsQ0FBQ0EsVUFBU0E7QUFBQTtBQUFBLE1BQ3JCO0FBQUE7QUFBQSxNQUVBLFFBQVE7QUFBQSxRQUNOLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFFBQVE7QUFBQSxRQUNSLFdBQVcsQ0FBQyxPQUFPLFlBQVk7QUFFN0IsZ0JBQU0sR0FBRyxZQUFZLENBQUMsVUFBVSxLQUFLLFFBQVE7QUFDM0MscUJBQVMsVUFBVSxVQUFVLElBQUksUUFBUSxVQUFVLEVBQUU7QUFBQSxVQUN2RCxDQUFDO0FBQUEsUUFDSDtBQUFBLE1BQ0Y7QUFBQSxJQUNGLElBQ0EsQ0FBQztBQUFB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
