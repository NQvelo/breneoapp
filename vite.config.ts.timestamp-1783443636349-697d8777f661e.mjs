// vite.config.ts
import { defineConfig, loadEnv } from "file:///Users/macbookpro/breneoapp/node_modules/vite/dist/node/index.js";
import react from "file:///Users/macbookpro/breneoapp/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import fs from "fs";
import { componentTagger } from "file:///Users/macbookpro/breneoapp/node_modules/lovable-tagger/dist/index.js";
import { VitePWA } from "file:///Users/macbookpro/breneoapp/node_modules/vite-plugin-pwa/dist/index.js";
var __vite_injected_original_dirname = "/Users/macbookpro/breneoapp";
var packageJson = JSON.parse(
  fs.readFileSync(path.resolve(__vite_injected_original_dirname, "package.json"), "utf-8")
);
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const jobAggregatorTarget = (env.JOB_AGGREGATOR_BASE_URL || env.VITE_JOB_AGGREGATOR_BASE_URL || env.VITE_JOB_API_BASE_URL || env.VITE_NEXT_PUBLIC_JOB_AGGREGATOR_URL || "https://breneo-job-aggregator.up.railway.app").replace(/\/$/, "");
  return {
    server: {
      host: "::",
      port: 8080,
      // ⚠️ TEMPORARY WORKAROUND: Proxy API requests through frontend (development only)
      // This bypasses CORS but is NOT a production solution
      proxy: mode === "development" ? {
        // Mock interview → job aggregator (`JOB_AGGREGATOR_BASE_URL`), not employer BFF.
        "/api/v1/interview": {
          target: jobAggregatorTarget,
          changeOrigin: true,
          secure: true
        },
        // Public industries list — proxy straight to Railway so it works even if employer-jobs-proxy (8787) is not running.
        "/api/industries": {
          target: "https://breneo-job-aggregator.up.railway.app",
          changeOrigin: true,
          secure: true
        },
        "/api/employer/companies": {
          target: "http://127.0.0.1:8787",
          changeOrigin: true
        },
        "/api/employer/staff-memberships": {
          target: "http://127.0.0.1:8787",
          changeOrigin: true
        },
        "/api/employer/access-state": {
          target: "http://127.0.0.1:8787",
          changeOrigin: true
        },
        "/api/employer/join-requests": {
          target: "http://127.0.0.1:8787",
          changeOrigin: true
        },
        "/api/employer/member-invites": {
          target: "http://127.0.0.1:8787",
          changeOrigin: true
        },
        "/api/employer/jobs": {
          target: "http://127.0.0.1:8787",
          changeOrigin: true
        },
        "/api/academy/course-analytics": {
          target: "http://127.0.0.1:8787",
          changeOrigin: true
        },
        // Job applications BFF: apply / my applications / withdraw / applicants (Breneo JWT + server secret).
        "/api/app": {
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
            "**/lovable-uploads/full-shot-student-library.jpg",
            "**/assets/geo-vendor-*.js"
          ],
          // Keep service-worker install fast by skipping oversized optional assets.
          maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
          // 2 MB
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
            // Never cache API traffic — avoids Cache.put failures on PATCH/POST and stale auth data.
            {
              urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
              handler: "NetworkOnly"
            },
            {
              urlPattern: /^https:\/\/breneo\.onrender\.com\/api\//i,
              handler: "NetworkOnly"
            },
            {
              // Handle navigation requests (SPA routes)
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "pages-cache",
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24,
                  // 24 hours
                  purgeOnQuotaError: true
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
              urlPattern: /\.(?:js|css)$/i,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "assets-cache",
                expiration: {
                  maxEntries: 120,
                  maxAgeSeconds: 60 * 60 * 24 * 7,
                  purgeOnQuotaError: true
                },
                cacheableResponse: {
                  statuses: [0, 200]
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
              // Non-API assets on Breneo origin (rare); keep network-first without mixing with /api/.
              urlPattern: ({ url }) => url.hostname === "breneo.onrender.com" && !url.pathname.startsWith("/api/"),
              handler: "NetworkFirst",
              options: {
                cacheName: "breneo-origin-cache",
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24,
                  purgeOnQuotaError: true
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
                  maxAgeSeconds: 60 * 60 * 24,
                  // 24 hours
                  purgeOnQuotaError: true
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        },
        // Avoid Workbox Cache API errors during local dev (PATCH /api, HMR, low disk space).
        devOptions: {
          enabled: false,
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
    },
    build: {
      minify: "esbuild",
      target: "es2020",
      sourcemap: false,
      cssCodeSplit: true,
      modulePreload: {
        polyfill: false
      },
      esbuild: {
        drop: mode === "production" ? ["console", "debugger"] : []
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/")) {
              return "react-vendor";
            }
            if (id.includes("/react-router/") || id.includes("/react-router-dom/") || id.includes("/@tanstack/react-query/")) {
              return "routing-data-vendor";
            }
            if (id.includes("/recharts/") || id.includes("/d3-")) {
              return "charts-vendor";
            }
            if (id.includes("/framer-motion/") || id.includes("/three/") || id.includes("/@react-three/")) {
              return "animation-3d-vendor";
            }
            if (id.includes("/country-state-city/")) {
              return "geo-vendor";
            }
            if (id.includes("/@radix-ui/") || id.includes("/cmdk/") || id.includes("/vaul/")) {
              return "ui-vendor";
            }
            if (id.includes("/posthog-js/")) {
              return "analytics-vendor";
            }
            if (id.includes("/@supabase/") || id.includes("/firebase/")) {
              return "backend-vendor";
            }
          }
        }
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvbWFjYm9va3Byby9icmVuZW9hcHBcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9tYWNib29rcHJvL2JyZW5lb2FwcC92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvbWFjYm9va3Byby9icmVuZW9hcHAvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgZnMgZnJvbSBcImZzXCI7XG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tIFwidml0ZS1wbHVnaW4tcHdhXCI7XG5cbmNvbnN0IHBhY2thZ2VKc29uID0gSlNPTi5wYXJzZShcbiAgZnMucmVhZEZpbGVTeW5jKHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwicGFja2FnZS5qc29uXCIpLCBcInV0Zi04XCIpLFxuKSBhcyB7IHZlcnNpb24/OiBzdHJpbmcgfTtcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcbiAgY29uc3QgZW52ID0gbG9hZEVudihtb2RlLCBwcm9jZXNzLmN3ZCgpLCBcIlwiKTtcbiAgY29uc3Qgam9iQWdncmVnYXRvclRhcmdldCA9IChcbiAgICBlbnYuSk9CX0FHR1JFR0FUT1JfQkFTRV9VUkwgfHxcbiAgICBlbnYuVklURV9KT0JfQUdHUkVHQVRPUl9CQVNFX1VSTCB8fFxuICAgIGVudi5WSVRFX0pPQl9BUElfQkFTRV9VUkwgfHxcbiAgICBlbnYuVklURV9ORVhUX1BVQkxJQ19KT0JfQUdHUkVHQVRPUl9VUkwgfHxcbiAgICBcImh0dHBzOi8vYnJlbmVvLWpvYi1hZ2dyZWdhdG9yLnVwLnJhaWx3YXkuYXBwXCJcbiAgKS5yZXBsYWNlKC9cXC8kLywgXCJcIik7XG5cbiAgcmV0dXJuIHtcbiAgc2VydmVyOiB7XG4gICAgaG9zdDogXCI6OlwiLFxuICAgIHBvcnQ6IDgwODAsXG4gICAgLy8gXHUyNkEwXHVGRTBGIFRFTVBPUkFSWSBXT1JLQVJPVU5EOiBQcm94eSBBUEkgcmVxdWVzdHMgdGhyb3VnaCBmcm9udGVuZCAoZGV2ZWxvcG1lbnQgb25seSlcbiAgICAvLyBUaGlzIGJ5cGFzc2VzIENPUlMgYnV0IGlzIE5PVCBhIHByb2R1Y3Rpb24gc29sdXRpb25cbiAgICBwcm94eTpcbiAgICAgIG1vZGUgPT09IFwiZGV2ZWxvcG1lbnRcIlxuICAgICAgICA/IHtcbiAgICAgICAgICAgIC8vIE1vY2sgaW50ZXJ2aWV3IFx1MjE5MiBqb2IgYWdncmVnYXRvciAoYEpPQl9BR0dSRUdBVE9SX0JBU0VfVVJMYCksIG5vdCBlbXBsb3llciBCRkYuXG4gICAgICAgICAgICBcIi9hcGkvdjEvaW50ZXJ2aWV3XCI6IHtcbiAgICAgICAgICAgICAgdGFyZ2V0OiBqb2JBZ2dyZWdhdG9yVGFyZ2V0LFxuICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgICAgIHNlY3VyZTogdHJ1ZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAvLyBQdWJsaWMgaW5kdXN0cmllcyBsaXN0IFx1MjAxNCBwcm94eSBzdHJhaWdodCB0byBSYWlsd2F5IHNvIGl0IHdvcmtzIGV2ZW4gaWYgZW1wbG95ZXItam9icy1wcm94eSAoODc4NykgaXMgbm90IHJ1bm5pbmcuXG4gICAgICAgICAgICBcIi9hcGkvaW5kdXN0cmllc1wiOiB7XG4gICAgICAgICAgICAgIHRhcmdldDogXCJodHRwczovL2JyZW5lby1qb2ItYWdncmVnYXRvci51cC5yYWlsd2F5LmFwcFwiLFxuICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgICAgIHNlY3VyZTogdHJ1ZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcIi9hcGkvZW1wbG95ZXIvY29tcGFuaWVzXCI6IHtcbiAgICAgICAgICAgICAgdGFyZ2V0OiBcImh0dHA6Ly8xMjcuMC4wLjE6ODc4N1wiLFxuICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCIvYXBpL2VtcGxveWVyL3N0YWZmLW1lbWJlcnNoaXBzXCI6IHtcbiAgICAgICAgICAgICAgdGFyZ2V0OiBcImh0dHA6Ly8xMjcuMC4wLjE6ODc4N1wiLFxuICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCIvYXBpL2VtcGxveWVyL2FjY2Vzcy1zdGF0ZVwiOiB7XG4gICAgICAgICAgICAgIHRhcmdldDogXCJodHRwOi8vMTI3LjAuMC4xOjg3ODdcIixcbiAgICAgICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiL2FwaS9lbXBsb3llci9qb2luLXJlcXVlc3RzXCI6IHtcbiAgICAgICAgICAgICAgdGFyZ2V0OiBcImh0dHA6Ly8xMjcuMC4wLjE6ODc4N1wiLFxuICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCIvYXBpL2VtcGxveWVyL21lbWJlci1pbnZpdGVzXCI6IHtcbiAgICAgICAgICAgICAgdGFyZ2V0OiBcImh0dHA6Ly8xMjcuMC4wLjE6ODc4N1wiLFxuICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCIvYXBpL2VtcGxveWVyL2pvYnNcIjoge1xuICAgICAgICAgICAgICB0YXJnZXQ6IFwiaHR0cDovLzEyNy4wLjAuMTo4Nzg3XCIsXG4gICAgICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcIi9hcGkvYWNhZGVteS9jb3Vyc2UtYW5hbHl0aWNzXCI6IHtcbiAgICAgICAgICAgICAgdGFyZ2V0OiBcImh0dHA6Ly8xMjcuMC4wLjE6ODc4N1wiLFxuICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgLy8gSm9iIGFwcGxpY2F0aW9ucyBCRkY6IGFwcGx5IC8gbXkgYXBwbGljYXRpb25zIC8gd2l0aGRyYXcgLyBhcHBsaWNhbnRzIChCcmVuZW8gSldUICsgc2VydmVyIHNlY3JldCkuXG4gICAgICAgICAgICBcIi9hcGkvYXBwXCI6IHtcbiAgICAgICAgICAgICAgdGFyZ2V0OiBcImh0dHA6Ly8xMjcuMC4wLjE6ODc4N1wiLFxuICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCIvYXBpL2pvYi1kZXRhaWxzXCI6IHtcbiAgICAgICAgICAgICAgdGFyZ2V0OiBcImh0dHBzOi8vYnJlbmVvLWpvYi1hZ2dyZWdhdG9yLnVwLnJhaWx3YXkuYXBwL1wiLFxuICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICAgICAgICAgIHJld3JpdGU6IChwYXRoKSA9PiBwYXRoLCAvLyBLZWVwIHRoZSBwYXRoIGFzLWlzXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgLy8gUHJveHkgYWxsIG90aGVyIC9hcGkgcmVxdWVzdHMgdG8gYnJlbmVvLm9ucmVuZGVyLmNvbVxuICAgICAgICAgICAgXCIvYXBpXCI6IHtcbiAgICAgICAgICAgICAgdGFyZ2V0OiBcImh0dHBzOi8vYnJlbmVvLm9ucmVuZGVyLmNvbVwiLFxuICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgICAgIHNlY3VyZTogdHJ1ZSxcbiAgICAgICAgICAgICAgY29uZmlndXJlOiAocHJveHksIG9wdGlvbnMpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgQ09SUyBoZWFkZXJzIHRvIHByb3hpZWQgcmVxdWVzdHNcbiAgICAgICAgICAgICAgICBwcm94eS5vbihcInByb3h5UmVxXCIsIChwcm94eVJlcSwgcmVxLCByZXMpID0+IHtcbiAgICAgICAgICAgICAgICAgIHByb3h5UmVxLnNldEhlYWRlcihcIk9yaWdpblwiLCByZXEuaGVhZGVycy5vcmlnaW4gfHwgXCJcIik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH1cbiAgICAgICAgOiB7fSxcbiAgfSxcbiAgYmFzZTogXCIvXCIsXG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIG1vZGUgPT09IFwiZGV2ZWxvcG1lbnRcIiAmJiBjb21wb25lbnRUYWdnZXIoKSxcbiAgICBWaXRlUFdBKHtcbiAgICAgIHJlZ2lzdGVyVHlwZTogXCJwcm9tcHRcIixcbiAgICAgIGluY2x1ZGVBc3NldHM6IFtcInJvYm90cy50eHRcIiwgXCJsb3ZhYmxlLXVwbG9hZHMvKi5wbmdcIl0sXG4gICAgICBtYW5pZmVzdDoge1xuICAgICAgICBuYW1lOiBcIkJyZW5lbyAtIEFJLVBvd2VyZWQgTGVhcm5pbmcgJiBKb2IgTWF0Y2hpbmcgUGxhdGZvcm1cIixcbiAgICAgICAgc2hvcnRfbmFtZTogXCJCcmVuZW9cIixcbiAgICAgICAgZGVzY3JpcHRpb246XG4gICAgICAgICAgXCJCcmVuZW8gaGVscHMgdXNlcnMgYXNzZXNzIHRoZWlyIHNraWxscywgZXhwbG9yZSBqb2Igb2ZmZXJzLCBhbmQgZm9sbG93IHBlcnNvbmFsaXplZCBsZWFybmluZyBwYXRocyB3aXRoIEFJIHRlY2hub2xvZ3kuXCIsXG4gICAgICAgIHRoZW1lX2NvbG9yOiBcIiNmZmZmZmZcIixcbiAgICAgICAgYmFja2dyb3VuZF9jb2xvcjogXCIjZmZmZmZmXCIsXG4gICAgICAgIGRpc3BsYXk6IFwic3RhbmRhbG9uZVwiLFxuICAgICAgICBvcmllbnRhdGlvbjogXCJwb3J0cmFpdFwiLFxuICAgICAgICBzY29wZTogXCIvXCIsXG4gICAgICAgIHN0YXJ0X3VybDogXCIvXCIsXG4gICAgICAgIGljb25zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgc3JjOiBcIi9sb3ZhYmxlLXVwbG9hZHMvYnJlbmVvLWZhdmljb24ucG5nXCIsXG4gICAgICAgICAgICBzaXplczogXCIxOTJ4MTkyXCIsXG4gICAgICAgICAgICB0eXBlOiBcImltYWdlL3BuZ1wiLFxuICAgICAgICAgICAgcHVycG9zZTogXCJhbnkgbWFza2FibGVcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHNyYzogXCIvbG92YWJsZS11cGxvYWRzL2JyZW5lby1mYXZpY29uLnBuZ1wiLFxuICAgICAgICAgICAgc2l6ZXM6IFwiNTEyeDUxMlwiLFxuICAgICAgICAgICAgdHlwZTogXCJpbWFnZS9wbmdcIixcbiAgICAgICAgICAgIHB1cnBvc2U6IFwiYW55IG1hc2thYmxlXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgICAgY2F0ZWdvcmllczogW1wiZWR1Y2F0aW9uXCIsIFwicHJvZHVjdGl2aXR5XCIsIFwiYnVzaW5lc3NcIl0sXG4gICAgICAgIHNob3J0Y3V0czogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIG5hbWU6IFwiRGFzaGJvYXJkXCIsXG4gICAgICAgICAgICBzaG9ydF9uYW1lOiBcIkRhc2hib2FyZFwiLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiVmlldyB5b3VyIGRhc2hib2FyZFwiLFxuICAgICAgICAgICAgdXJsOiBcIi9kYXNoYm9hcmRcIixcbiAgICAgICAgICAgIGljb25zOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzcmM6IFwiL2xvdmFibGUtdXBsb2Fkcy9icmVuZW8tZmF2aWNvbi5wbmdcIixcbiAgICAgICAgICAgICAgICBzaXplczogXCI5Nng5NlwiLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIHdvcmtib3g6IHtcbiAgICAgICAgZ2xvYlBhdHRlcm5zOiBbXCIqKi8qLntqcyxjc3MsaHRtbCxzdmcsd29mZix3b2ZmMix0dGZ9XCJdLFxuICAgICAgICBnbG9iSWdub3JlczogW1xuICAgICAgICAgIFwiKiovZmF2aWNvbi5pY29cIixcbiAgICAgICAgICBcIioqL2xvdmFibGUtdXBsb2Fkcy9hY2FkZW15LnBuZ1wiLFxuICAgICAgICAgIFwiKiovbG92YWJsZS11cGxvYWRzL2Z1dHVyZS5wbmdcIixcbiAgICAgICAgICBcIioqL2xvdmFibGUtdXBsb2Fkcy93YXkucG5nXCIsXG4gICAgICAgICAgXCIqKi9sb3ZhYmxlLXVwbG9hZHMvZnVsbC1zaG90LXN0dWRlbnQtbGlicmFyeS5qcGdcIixcbiAgICAgICAgICBcIioqL2Fzc2V0cy9nZW8tdmVuZG9yLSouanNcIixcbiAgICAgICAgXSxcbiAgICAgICAgLy8gS2VlcCBzZXJ2aWNlLXdvcmtlciBpbnN0YWxsIGZhc3QgYnkgc2tpcHBpbmcgb3ZlcnNpemVkIG9wdGlvbmFsIGFzc2V0cy5cbiAgICAgICAgbWF4aW11bUZpbGVTaXplVG9DYWNoZUluQnl0ZXM6IDIgKiAxMDI0ICogMTAyNCwgLy8gMiBNQlxuICAgICAgICAvLyBIYW5kbGUgU1BBIHJvdXRpbmcgLSBmYWxsYmFjayB0byBpbmRleC5odG1sIGZvciBuYXZpZ2F0aW9uIHJlcXVlc3RzXG4gICAgICAgIG5hdmlnYXRlRmFsbGJhY2s6IFwiL2luZGV4Lmh0bWxcIixcbiAgICAgICAgbmF2aWdhdGVGYWxsYmFja0RlbnlsaXN0OiBbXG4gICAgICAgICAgLy8gRG9uJ3QgZmFsbGJhY2sgZm9yIEFQSSByb3V0ZXNcbiAgICAgICAgICAvXlxcL2FwaVxcLy4qLyxcbiAgICAgICAgICAvLyBEb24ndCBmYWxsYmFjayBmb3Igc3RhdGljIGFzc2V0c1xuICAgICAgICAgIC9cXC4oPzpwbmd8anBnfGpwZWd8c3ZnfGdpZnx3ZWJwfGljb3x3b2ZmfHdvZmYyfHR0Znxlb3QpJC8sXG4gICAgICAgIF0sXG4gICAgICAgIC8vIFNraXAgd2FpdGluZyBhbmQgY2xhaW0gY2xpZW50cyBmb3IgZmFzdGVyIHVwZGF0ZXNcbiAgICAgICAgc2tpcFdhaXRpbmc6IHRydWUsXG4gICAgICAgIGNsaWVudHNDbGFpbTogdHJ1ZSxcbiAgICAgICAgLy8gRG9uJ3QgcHJlY2FjaGUgcm91dGVzIC0gaGFuZGxlIHRoZW0gYXQgcnVudGltZVxuICAgICAgICBkb250Q2FjaGVCdXN0VVJMc01hdGNoaW5nOiAvXFwuXFx3ezh9XFwuLyxcbiAgICAgICAgcnVudGltZUNhY2hpbmc6IFtcbiAgICAgICAgICAvLyBOZXZlciBjYWNoZSBBUEkgdHJhZmZpYyBcdTIwMTQgYXZvaWRzIENhY2hlLnB1dCBmYWlsdXJlcyBvbiBQQVRDSC9QT1NUIGFuZCBzdGFsZSBhdXRoIGRhdGEuXG4gICAgICAgICAge1xuICAgICAgICAgICAgdXJsUGF0dGVybjogKHsgdXJsIH0pID0+IHVybC5wYXRobmFtZS5zdGFydHNXaXRoKFwiL2FwaS9cIiksXG4gICAgICAgICAgICBoYW5kbGVyOiBcIk5ldHdvcmtPbmx5XCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXmh0dHBzOlxcL1xcL2JyZW5lb1xcLm9ucmVuZGVyXFwuY29tXFwvYXBpXFwvL2ksXG4gICAgICAgICAgICBoYW5kbGVyOiBcIk5ldHdvcmtPbmx5XCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAvLyBIYW5kbGUgbmF2aWdhdGlvbiByZXF1ZXN0cyAoU1BBIHJvdXRlcylcbiAgICAgICAgICAgIHVybFBhdHRlcm46ICh7IHJlcXVlc3QgfSkgPT4gcmVxdWVzdC5tb2RlID09PSBcIm5hdmlnYXRlXCIsXG4gICAgICAgICAgICBoYW5kbGVyOiBcIk5ldHdvcmtGaXJzdFwiLFxuICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICBjYWNoZU5hbWU6IFwicGFnZXMtY2FjaGVcIixcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjoge1xuICAgICAgICAgICAgICAgIG1heEVudHJpZXM6IDUwLFxuICAgICAgICAgICAgICAgIG1heEFnZVNlY29uZHM6IDYwICogNjAgKiAyNCwgLy8gMjQgaG91cnNcbiAgICAgICAgICAgICAgICBwdXJnZU9uUXVvdGFFcnJvcjogdHJ1ZSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY2FjaGVhYmxlUmVzcG9uc2U6IHtcbiAgICAgICAgICAgICAgICBzdGF0dXNlczogWzAsIDIwMF0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgdXJsUGF0dGVybjogL1xcLig/OnBuZ3xqcGd8anBlZ3xzdmd8Z2lmfHdlYnApJC9pLFxuICAgICAgICAgICAgaGFuZGxlcjogXCJDYWNoZUZpcnN0XCIsXG4gICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgIGNhY2hlTmFtZTogXCJpbWFnZXMtY2FjaGVcIixcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjoge1xuICAgICAgICAgICAgICAgIG1heEVudHJpZXM6IDEwMCxcbiAgICAgICAgICAgICAgICBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwICogMjQgKiAzMCwgLy8gMzAgZGF5c1xuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHVybFBhdHRlcm46IC9cXC4oPzpqc3xjc3MpJC9pLFxuICAgICAgICAgICAgaGFuZGxlcjogXCJTdGFsZVdoaWxlUmV2YWxpZGF0ZVwiLFxuICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICBjYWNoZU5hbWU6IFwiYXNzZXRzLWNhY2hlXCIsXG4gICAgICAgICAgICAgIGV4cGlyYXRpb246IHtcbiAgICAgICAgICAgICAgICBtYXhFbnRyaWVzOiAxMjAsXG4gICAgICAgICAgICAgICAgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0ICogNyxcbiAgICAgICAgICAgICAgICBwdXJnZU9uUXVvdGFFcnJvcjogdHJ1ZSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY2FjaGVhYmxlUmVzcG9uc2U6IHtcbiAgICAgICAgICAgICAgICBzdGF0dXNlczogWzAsIDIwMF0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgLy8gSGFuZGxlIG1hbmlmZXN0LndlYm1hbmlmZXN0IHJlcXVlc3RzXG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAvbWFuaWZlc3RcXC53ZWJtYW5pZmVzdCQvaSxcbiAgICAgICAgICAgIGhhbmRsZXI6IFwiTmV0d29ya0ZpcnN0XCIsXG4gICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgIGNhY2hlTmFtZTogXCJtYW5pZmVzdC1jYWNoZVwiLFxuICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgbWF4RW50cmllczogMSxcbiAgICAgICAgICAgICAgICBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwICogMjQsIC8vIDI0IGhvdXJzXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgLy8gTm9uLUFQSSBhc3NldHMgb24gQnJlbmVvIG9yaWdpbiAocmFyZSk7IGtlZXAgbmV0d29yay1maXJzdCB3aXRob3V0IG1peGluZyB3aXRoIC9hcGkvLlxuICAgICAgICAgICAgdXJsUGF0dGVybjogKHsgdXJsIH0pID0+XG4gICAgICAgICAgICAgIHVybC5ob3N0bmFtZSA9PT0gXCJicmVuZW8ub25yZW5kZXIuY29tXCIgJiZcbiAgICAgICAgICAgICAgIXVybC5wYXRobmFtZS5zdGFydHNXaXRoKFwiL2FwaS9cIiksXG4gICAgICAgICAgICBoYW5kbGVyOiBcIk5ldHdvcmtGaXJzdFwiLFxuICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICBjYWNoZU5hbWU6IFwiYnJlbmVvLW9yaWdpbi1jYWNoZVwiLFxuICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgbWF4RW50cmllczogMzAsXG4gICAgICAgICAgICAgICAgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0LFxuICAgICAgICAgICAgICAgIHB1cmdlT25RdW90YUVycm9yOiB0cnVlLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjYWNoZWFibGVSZXNwb25zZToge1xuICAgICAgICAgICAgICAgIHN0YXR1c2VzOiBbMCwgMjAwXSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXmh0dHBzOlxcL1xcLy4qXFwuc3VwYWJhc2VcXC5jb1xcLy4qL2ksXG4gICAgICAgICAgICBoYW5kbGVyOiBcIk5ldHdvcmtGaXJzdFwiLFxuICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICBjYWNoZU5hbWU6IFwic3VwYWJhc2UtY2FjaGVcIixcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjoge1xuICAgICAgICAgICAgICAgIG1heEVudHJpZXM6IDUwLFxuICAgICAgICAgICAgICAgIG1heEFnZVNlY29uZHM6IDYwICogNjAgKiAyNCwgLy8gMjQgaG91cnNcbiAgICAgICAgICAgICAgICBwdXJnZU9uUXVvdGFFcnJvcjogdHJ1ZSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY2FjaGVhYmxlUmVzcG9uc2U6IHtcbiAgICAgICAgICAgICAgICBzdGF0dXNlczogWzAsIDIwMF0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICAgLy8gQXZvaWQgV29ya2JveCBDYWNoZSBBUEkgZXJyb3JzIGR1cmluZyBsb2NhbCBkZXYgKFBBVENIIC9hcGksIEhNUiwgbG93IGRpc2sgc3BhY2UpLlxuICAgICAgZGV2T3B0aW9uczoge1xuICAgICAgICBlbmFibGVkOiBmYWxzZSxcbiAgICAgICAgdHlwZTogXCJtb2R1bGVcIixcbiAgICAgIH0sXG4gICAgICAvLyBBZGRpdGlvbmFsIG9wdGlvbnMgdG8gaGFuZGxlIG1pc3Npbmcgcm91dGVzIGdyYWNlZnVsbHlcbiAgICAgIGluamVjdFJlZ2lzdGVyOiBcImF1dG9cIixcbiAgICB9KSxcbiAgXS5maWx0ZXIoQm9vbGVhbiksXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgfSxcbiAgfSxcbiAgZGVmaW5lOiB7XG4gICAgX19BUFBfVkVSU0lPTl9fOiBKU09OLnN0cmluZ2lmeShwYWNrYWdlSnNvbi52ZXJzaW9uIHx8IFwiMC4wLjBcIiksXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgbWluaWZ5OiBcImVzYnVpbGRcIixcbiAgICB0YXJnZXQ6IFwiZXMyMDIwXCIsXG4gICAgc291cmNlbWFwOiBmYWxzZSxcbiAgICBjc3NDb2RlU3BsaXQ6IHRydWUsXG4gICAgbW9kdWxlUHJlbG9hZDoge1xuICAgICAgcG9seWZpbGw6IGZhbHNlLFxuICAgIH0sXG4gICAgZXNidWlsZDoge1xuICAgICAgZHJvcDogbW9kZSA9PT0gXCJwcm9kdWN0aW9uXCIgPyBbXCJjb25zb2xlXCIsIFwiZGVidWdnZXJcIl0gOiBbXSxcbiAgICB9LFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3MoaWQpIHtcbiAgICAgICAgICBpZiAoIWlkLmluY2x1ZGVzKFwibm9kZV9tb2R1bGVzXCIpKSByZXR1cm47XG5cbiAgICAgICAgICAvLyBLZWVwIFJlYWN0IHN0YWNrIGluIG9uZSBzdGFibGUgY2h1bmsuXG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvcmVhY3QvXCIpIHx8XG4gICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9yZWFjdC1kb20vXCIpIHx8XG4gICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9zY2hlZHVsZXIvXCIpXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJyZWFjdC12ZW5kb3JcIjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBSb3V0ZXIgKyBkYXRhL2NhY2hlIGxheWVyIHVzZWQgb24gbW9zdCBwYWdlcy5cbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9yZWFjdC1yb3V0ZXIvXCIpIHx8XG4gICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9yZWFjdC1yb3V0ZXItZG9tL1wiKSB8fFxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5L1wiKVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgcmV0dXJuIFwicm91dGluZy1kYXRhLXZlbmRvclwiO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIEhlYXZ5IGNoYXJ0aW5nIGxpYnMuXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwiL3JlY2hhcnRzL1wiKSB8fCBpZC5pbmNsdWRlcyhcIi9kMy1cIikpIHtcbiAgICAgICAgICAgIHJldHVybiBcImNoYXJ0cy12ZW5kb3JcIjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBBbmltYXRpb24gYW5kIDNEIGRlcGVuZGVuY2llcyBhcmUgbGFyZ2UgYW5kIHJvdXRlLXNwZWNpZmljLlxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL2ZyYW1lci1tb3Rpb24vXCIpIHx8XG4gICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi90aHJlZS9cIikgfHxcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL0ByZWFjdC10aHJlZS9cIilcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIHJldHVybiBcImFuaW1hdGlvbi0zZC12ZW5kb3JcIjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBWZXJ5IGxhcmdlIHdvcmxkIGNvdW50cnkvY2l0eSBkYXRhc2V0OyBrZWVwIGlzb2xhdGVkIGFuZCBsYXp5LWxvYWRhYmxlLlxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcIi9jb3VudHJ5LXN0YXRlLWNpdHkvXCIpKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJnZW8tdmVuZG9yXCI7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gVUkgcHJpbWl0aXZlcyAoUmFkaXggKyB1dGlsaXR5IHdyYXBwZXJzKS5cbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9AcmFkaXgtdWkvXCIpIHx8XG4gICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9jbWRrL1wiKSB8fFxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvdmF1bC9cIilcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIHJldHVybiBcInVpLXZlbmRvclwiO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcIi9wb3N0aG9nLWpzL1wiKSkge1xuICAgICAgICAgICAgcmV0dXJuIFwiYW5hbHl0aWNzLXZlbmRvclwiO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcIi9Ac3VwYWJhc2UvXCIpIHx8IGlkLmluY2x1ZGVzKFwiL2ZpcmViYXNlL1wiKSkge1xuICAgICAgICAgICAgcmV0dXJuIFwiYmFja2VuZC12ZW5kb3JcIjtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG59O1xufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQW1RLFNBQVMsY0FBYyxlQUFlO0FBQ3pTLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsT0FBTyxRQUFRO0FBQ2YsU0FBUyx1QkFBdUI7QUFDaEMsU0FBUyxlQUFlO0FBTHhCLElBQU0sbUNBQW1DO0FBT3pDLElBQU0sY0FBYyxLQUFLO0FBQUEsRUFDdkIsR0FBRyxhQUFhLEtBQUssUUFBUSxrQ0FBVyxjQUFjLEdBQUcsT0FBTztBQUNsRTtBQUdBLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxNQUFNO0FBQ3hDLFFBQU0sTUFBTSxRQUFRLE1BQU0sUUFBUSxJQUFJLEdBQUcsRUFBRTtBQUMzQyxRQUFNLHVCQUNKLElBQUksMkJBQ0osSUFBSSxnQ0FDSixJQUFJLHlCQUNKLElBQUksdUNBQ0osZ0RBQ0EsUUFBUSxPQUFPLEVBQUU7QUFFbkIsU0FBTztBQUFBLElBQ1AsUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sTUFBTTtBQUFBO0FBQUE7QUFBQSxNQUdOLE9BQ0UsU0FBUyxnQkFDTDtBQUFBO0FBQUEsUUFFRSxxQkFBcUI7QUFBQSxVQUNuQixRQUFRO0FBQUEsVUFDUixjQUFjO0FBQUEsVUFDZCxRQUFRO0FBQUEsUUFDVjtBQUFBO0FBQUEsUUFFQSxtQkFBbUI7QUFBQSxVQUNqQixRQUFRO0FBQUEsVUFDUixjQUFjO0FBQUEsVUFDZCxRQUFRO0FBQUEsUUFDVjtBQUFBLFFBQ0EsMkJBQTJCO0FBQUEsVUFDekIsUUFBUTtBQUFBLFVBQ1IsY0FBYztBQUFBLFFBQ2hCO0FBQUEsUUFDQSxtQ0FBbUM7QUFBQSxVQUNqQyxRQUFRO0FBQUEsVUFDUixjQUFjO0FBQUEsUUFDaEI7QUFBQSxRQUNBLDhCQUE4QjtBQUFBLFVBQzVCLFFBQVE7QUFBQSxVQUNSLGNBQWM7QUFBQSxRQUNoQjtBQUFBLFFBQ0EsK0JBQStCO0FBQUEsVUFDN0IsUUFBUTtBQUFBLFVBQ1IsY0FBYztBQUFBLFFBQ2hCO0FBQUEsUUFDQSxnQ0FBZ0M7QUFBQSxVQUM5QixRQUFRO0FBQUEsVUFDUixjQUFjO0FBQUEsUUFDaEI7QUFBQSxRQUNBLHNCQUFzQjtBQUFBLFVBQ3BCLFFBQVE7QUFBQSxVQUNSLGNBQWM7QUFBQSxRQUNoQjtBQUFBLFFBQ0EsaUNBQWlDO0FBQUEsVUFDL0IsUUFBUTtBQUFBLFVBQ1IsY0FBYztBQUFBLFFBQ2hCO0FBQUE7QUFBQSxRQUVBLFlBQVk7QUFBQSxVQUNWLFFBQVE7QUFBQSxVQUNSLGNBQWM7QUFBQSxRQUNoQjtBQUFBLFFBQ0Esb0JBQW9CO0FBQUEsVUFDbEIsUUFBUTtBQUFBLFVBQ1IsY0FBYztBQUFBLFVBQ2QsUUFBUTtBQUFBLFVBQ1IsU0FBUyxDQUFDQSxVQUFTQTtBQUFBO0FBQUEsUUFDckI7QUFBQTtBQUFBLFFBRUEsUUFBUTtBQUFBLFVBQ04sUUFBUTtBQUFBLFVBQ1IsY0FBYztBQUFBLFVBQ2QsUUFBUTtBQUFBLFVBQ1IsV0FBVyxDQUFDLE9BQU8sWUFBWTtBQUU3QixrQkFBTSxHQUFHLFlBQVksQ0FBQyxVQUFVLEtBQUssUUFBUTtBQUMzQyx1QkFBUyxVQUFVLFVBQVUsSUFBSSxRQUFRLFVBQVUsRUFBRTtBQUFBLFlBQ3ZELENBQUM7QUFBQSxVQUNIO0FBQUEsUUFDRjtBQUFBLE1BQ0YsSUFDQSxDQUFDO0FBQUEsSUFDVDtBQUFBLElBQ0EsTUFBTTtBQUFBLElBQ04sU0FBUztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ04sU0FBUyxpQkFBaUIsZ0JBQWdCO0FBQUEsTUFDMUMsUUFBUTtBQUFBLFFBQ04sY0FBYztBQUFBLFFBQ2QsZUFBZSxDQUFDLGNBQWMsdUJBQXVCO0FBQUEsUUFDckQsVUFBVTtBQUFBLFVBQ1IsTUFBTTtBQUFBLFVBQ04sWUFBWTtBQUFBLFVBQ1osYUFDRTtBQUFBLFVBQ0YsYUFBYTtBQUFBLFVBQ2Isa0JBQWtCO0FBQUEsVUFDbEIsU0FBUztBQUFBLFVBQ1QsYUFBYTtBQUFBLFVBQ2IsT0FBTztBQUFBLFVBQ1AsV0FBVztBQUFBLFVBQ1gsT0FBTztBQUFBLFlBQ0w7QUFBQSxjQUNFLEtBQUs7QUFBQSxjQUNMLE9BQU87QUFBQSxjQUNQLE1BQU07QUFBQSxjQUNOLFNBQVM7QUFBQSxZQUNYO0FBQUEsWUFDQTtBQUFBLGNBQ0UsS0FBSztBQUFBLGNBQ0wsT0FBTztBQUFBLGNBQ1AsTUFBTTtBQUFBLGNBQ04sU0FBUztBQUFBLFlBQ1g7QUFBQSxVQUNGO0FBQUEsVUFDQSxZQUFZLENBQUMsYUFBYSxnQkFBZ0IsVUFBVTtBQUFBLFVBQ3BELFdBQVc7QUFBQSxZQUNUO0FBQUEsY0FDRSxNQUFNO0FBQUEsY0FDTixZQUFZO0FBQUEsY0FDWixhQUFhO0FBQUEsY0FDYixLQUFLO0FBQUEsY0FDTCxPQUFPO0FBQUEsZ0JBQ0w7QUFBQSxrQkFDRSxLQUFLO0FBQUEsa0JBQ0wsT0FBTztBQUFBLGdCQUNUO0FBQUEsY0FDRjtBQUFBLFlBQ0Y7QUFBQSxVQUNGO0FBQUEsUUFDRjtBQUFBLFFBQ0EsU0FBUztBQUFBLFVBQ1AsY0FBYyxDQUFDLHVDQUF1QztBQUFBLFVBQ3RELGFBQWE7QUFBQSxZQUNYO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxVQUNGO0FBQUE7QUFBQSxVQUVBLCtCQUErQixJQUFJLE9BQU87QUFBQTtBQUFBO0FBQUEsVUFFMUMsa0JBQWtCO0FBQUEsVUFDbEIsMEJBQTBCO0FBQUE7QUFBQSxZQUV4QjtBQUFBO0FBQUEsWUFFQTtBQUFBLFVBQ0Y7QUFBQTtBQUFBLFVBRUEsYUFBYTtBQUFBLFVBQ2IsY0FBYztBQUFBO0FBQUEsVUFFZCwyQkFBMkI7QUFBQSxVQUMzQixnQkFBZ0I7QUFBQTtBQUFBLFlBRWQ7QUFBQSxjQUNFLFlBQVksQ0FBQyxFQUFFLElBQUksTUFBTSxJQUFJLFNBQVMsV0FBVyxPQUFPO0FBQUEsY0FDeEQsU0FBUztBQUFBLFlBQ1g7QUFBQSxZQUNBO0FBQUEsY0FDRSxZQUFZO0FBQUEsY0FDWixTQUFTO0FBQUEsWUFDWDtBQUFBLFlBQ0E7QUFBQTtBQUFBLGNBRUUsWUFBWSxDQUFDLEVBQUUsUUFBUSxNQUFNLFFBQVEsU0FBUztBQUFBLGNBQzlDLFNBQVM7QUFBQSxjQUNULFNBQVM7QUFBQSxnQkFDUCxXQUFXO0FBQUEsZ0JBQ1gsWUFBWTtBQUFBLGtCQUNWLFlBQVk7QUFBQSxrQkFDWixlQUFlLEtBQUssS0FBSztBQUFBO0FBQUEsa0JBQ3pCLG1CQUFtQjtBQUFBLGdCQUNyQjtBQUFBLGdCQUNBLG1CQUFtQjtBQUFBLGtCQUNqQixVQUFVLENBQUMsR0FBRyxHQUFHO0FBQUEsZ0JBQ25CO0FBQUEsY0FDRjtBQUFBLFlBQ0Y7QUFBQSxZQUNBO0FBQUEsY0FDRSxZQUFZO0FBQUEsY0FDWixTQUFTO0FBQUEsY0FDVCxTQUFTO0FBQUEsZ0JBQ1AsV0FBVztBQUFBLGdCQUNYLFlBQVk7QUFBQSxrQkFDVixZQUFZO0FBQUEsa0JBQ1osZUFBZSxLQUFLLEtBQUssS0FBSztBQUFBO0FBQUEsZ0JBQ2hDO0FBQUEsY0FDRjtBQUFBLFlBQ0Y7QUFBQSxZQUNBO0FBQUEsY0FDRSxZQUFZO0FBQUEsY0FDWixTQUFTO0FBQUEsY0FDVCxTQUFTO0FBQUEsZ0JBQ1AsV0FBVztBQUFBLGdCQUNYLFlBQVk7QUFBQSxrQkFDVixZQUFZO0FBQUEsa0JBQ1osZUFBZSxLQUFLLEtBQUssS0FBSztBQUFBLGtCQUM5QixtQkFBbUI7QUFBQSxnQkFDckI7QUFBQSxnQkFDQSxtQkFBbUI7QUFBQSxrQkFDakIsVUFBVSxDQUFDLEdBQUcsR0FBRztBQUFBLGdCQUNuQjtBQUFBLGNBQ0Y7QUFBQSxZQUNGO0FBQUEsWUFDQTtBQUFBO0FBQUEsY0FFRSxZQUFZO0FBQUEsY0FDWixTQUFTO0FBQUEsY0FDVCxTQUFTO0FBQUEsZ0JBQ1AsV0FBVztBQUFBLGdCQUNYLFlBQVk7QUFBQSxrQkFDVixZQUFZO0FBQUEsa0JBQ1osZUFBZSxLQUFLLEtBQUs7QUFBQTtBQUFBLGdCQUMzQjtBQUFBLGNBQ0Y7QUFBQSxZQUNGO0FBQUEsWUFDQTtBQUFBO0FBQUEsY0FFRSxZQUFZLENBQUMsRUFBRSxJQUFJLE1BQ2pCLElBQUksYUFBYSx5QkFDakIsQ0FBQyxJQUFJLFNBQVMsV0FBVyxPQUFPO0FBQUEsY0FDbEMsU0FBUztBQUFBLGNBQ1QsU0FBUztBQUFBLGdCQUNQLFdBQVc7QUFBQSxnQkFDWCxZQUFZO0FBQUEsa0JBQ1YsWUFBWTtBQUFBLGtCQUNaLGVBQWUsS0FBSyxLQUFLO0FBQUEsa0JBQ3pCLG1CQUFtQjtBQUFBLGdCQUNyQjtBQUFBLGdCQUNBLG1CQUFtQjtBQUFBLGtCQUNqQixVQUFVLENBQUMsR0FBRyxHQUFHO0FBQUEsZ0JBQ25CO0FBQUEsY0FDRjtBQUFBLFlBQ0Y7QUFBQSxZQUNBO0FBQUEsY0FDRSxZQUFZO0FBQUEsY0FDWixTQUFTO0FBQUEsY0FDVCxTQUFTO0FBQUEsZ0JBQ1AsV0FBVztBQUFBLGdCQUNYLFlBQVk7QUFBQSxrQkFDVixZQUFZO0FBQUEsa0JBQ1osZUFBZSxLQUFLLEtBQUs7QUFBQTtBQUFBLGtCQUN6QixtQkFBbUI7QUFBQSxnQkFDckI7QUFBQSxnQkFDQSxtQkFBbUI7QUFBQSxrQkFDakIsVUFBVSxDQUFDLEdBQUcsR0FBRztBQUFBLGdCQUNuQjtBQUFBLGNBQ0Y7QUFBQSxZQUNGO0FBQUEsVUFDRjtBQUFBLFFBQ0Y7QUFBQTtBQUFBLFFBRUEsWUFBWTtBQUFBLFVBQ1YsU0FBUztBQUFBLFVBQ1QsTUFBTTtBQUFBLFFBQ1I7QUFBQTtBQUFBLFFBRUEsZ0JBQWdCO0FBQUEsTUFDbEIsQ0FBQztBQUFBLElBQ0gsRUFBRSxPQUFPLE9BQU87QUFBQSxJQUNoQixTQUFTO0FBQUEsTUFDUCxPQUFPO0FBQUEsUUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsTUFDdEM7QUFBQSxJQUNGO0FBQUEsSUFDQSxRQUFRO0FBQUEsTUFDTixpQkFBaUIsS0FBSyxVQUFVLFlBQVksV0FBVyxPQUFPO0FBQUEsSUFDaEU7QUFBQSxJQUNBLE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxNQUNSLFFBQVE7QUFBQSxNQUNSLFdBQVc7QUFBQSxNQUNYLGNBQWM7QUFBQSxNQUNkLGVBQWU7QUFBQSxRQUNiLFVBQVU7QUFBQSxNQUNaO0FBQUEsTUFDQSxTQUFTO0FBQUEsUUFDUCxNQUFNLFNBQVMsZUFBZSxDQUFDLFdBQVcsVUFBVSxJQUFJLENBQUM7QUFBQSxNQUMzRDtBQUFBLE1BQ0EsZUFBZTtBQUFBLFFBQ2IsUUFBUTtBQUFBLFVBQ04sYUFBYSxJQUFJO0FBQ2YsZ0JBQUksQ0FBQyxHQUFHLFNBQVMsY0FBYyxFQUFHO0FBR2xDLGdCQUNFLEdBQUcsU0FBUyxTQUFTLEtBQ3JCLEdBQUcsU0FBUyxhQUFhLEtBQ3pCLEdBQUcsU0FBUyxhQUFhLEdBQ3pCO0FBQ0EscUJBQU87QUFBQSxZQUNUO0FBR0EsZ0JBQ0UsR0FBRyxTQUFTLGdCQUFnQixLQUM1QixHQUFHLFNBQVMsb0JBQW9CLEtBQ2hDLEdBQUcsU0FBUyx5QkFBeUIsR0FDckM7QUFDQSxxQkFBTztBQUFBLFlBQ1Q7QUFHQSxnQkFBSSxHQUFHLFNBQVMsWUFBWSxLQUFLLEdBQUcsU0FBUyxNQUFNLEdBQUc7QUFDcEQscUJBQU87QUFBQSxZQUNUO0FBR0EsZ0JBQ0UsR0FBRyxTQUFTLGlCQUFpQixLQUM3QixHQUFHLFNBQVMsU0FBUyxLQUNyQixHQUFHLFNBQVMsZ0JBQWdCLEdBQzVCO0FBQ0EscUJBQU87QUFBQSxZQUNUO0FBR0EsZ0JBQUksR0FBRyxTQUFTLHNCQUFzQixHQUFHO0FBQ3ZDLHFCQUFPO0FBQUEsWUFDVDtBQUdBLGdCQUNFLEdBQUcsU0FBUyxhQUFhLEtBQ3pCLEdBQUcsU0FBUyxRQUFRLEtBQ3BCLEdBQUcsU0FBUyxRQUFRLEdBQ3BCO0FBQ0EscUJBQU87QUFBQSxZQUNUO0FBRUEsZ0JBQUksR0FBRyxTQUFTLGNBQWMsR0FBRztBQUMvQixxQkFBTztBQUFBLFlBQ1Q7QUFFQSxnQkFBSSxHQUFHLFNBQVMsYUFBYSxLQUFLLEdBQUcsU0FBUyxZQUFZLEdBQUc7QUFDM0QscUJBQU87QUFBQSxZQUNUO0FBQUEsVUFDRjtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDQSxDQUFDOyIsCiAgIm5hbWVzIjogWyJwYXRoIl0KfQo=
