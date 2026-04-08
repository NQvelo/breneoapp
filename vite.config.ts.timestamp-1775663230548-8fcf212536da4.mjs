// vite.config.ts
import { defineConfig } from "file:///Users/macbookpro/breneoapp/node_modules/vite/dist/node/index.js";
import react from "file:///Users/macbookpro/breneoapp/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import fs from "fs";
import { componentTagger } from "file:///Users/macbookpro/breneoapp/node_modules/lovable-tagger/dist/index.js";
import { VitePWA } from "file:///Users/macbookpro/breneoapp/node_modules/vite-plugin-pwa/dist/index.js";
var __vite_injected_original_dirname = "/Users/macbookpro/breneoapp";
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
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvbWFjYm9va3Byby9icmVuZW9hcHBcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9tYWNib29rcHJvL2JyZW5lb2FwcC92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvbWFjYm9va3Byby9icmVuZW9hcHAvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgZnMgZnJvbSBcImZzXCI7XG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tIFwidml0ZS1wbHVnaW4tcHdhXCI7XG5cbmNvbnN0IHBhY2thZ2VKc29uID0gSlNPTi5wYXJzZShcbiAgZnMucmVhZEZpbGVTeW5jKHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwicGFja2FnZS5qc29uXCIpLCBcInV0Zi04XCIpLFxuKSBhcyB7IHZlcnNpb24/OiBzdHJpbmcgfTtcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+ICh7XG4gIHNlcnZlcjoge1xuICAgIGhvc3Q6IFwiOjpcIixcbiAgICBwb3J0OiA4MDgwLFxuICAgIC8vIFx1MjZBMFx1RkUwRiBURU1QT1JBUlkgV09SS0FST1VORDogUHJveHkgQVBJIHJlcXVlc3RzIHRocm91Z2ggZnJvbnRlbmQgKGRldmVsb3BtZW50IG9ubHkpXG4gICAgLy8gVGhpcyBieXBhc3NlcyBDT1JTIGJ1dCBpcyBOT1QgYSBwcm9kdWN0aW9uIHNvbHV0aW9uXG4gICAgcHJveHk6XG4gICAgICBtb2RlID09PSBcImRldmVsb3BtZW50XCJcbiAgICAgICAgPyB7XG4gICAgICAgICAgICAvLyBQdWJsaWMgaW5kdXN0cmllcyBsaXN0IFx1MjAxNCBwcm94eSBzdHJhaWdodCB0byBSYWlsd2F5IHNvIGl0IHdvcmtzIGV2ZW4gaWYgZW1wbG95ZXItam9icy1wcm94eSAoODc4NykgaXMgbm90IHJ1bm5pbmcuXG4gICAgICAgICAgICBcIi9hcGkvaW5kdXN0cmllc1wiOiB7XG4gICAgICAgICAgICAgIHRhcmdldDogXCJodHRwczovL2JyZW5lby1qb2ItYWdncmVnYXRvci51cC5yYWlsd2F5LmFwcFwiLFxuICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgICAgIHNlY3VyZTogdHJ1ZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcIi9hcGkvZW1wbG95ZXIvY29tcGFuaWVzXCI6IHtcbiAgICAgICAgICAgICAgdGFyZ2V0OiBcImh0dHA6Ly8xMjcuMC4wLjE6ODc4N1wiLFxuICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCIvYXBpL2VtcGxveWVyL3N0YWZmLW1lbWJlcnNoaXBzXCI6IHtcbiAgICAgICAgICAgICAgdGFyZ2V0OiBcImh0dHA6Ly8xMjcuMC4wLjE6ODc4N1wiLFxuICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCIvYXBpL2VtcGxveWVyL2pvYnNcIjoge1xuICAgICAgICAgICAgICB0YXJnZXQ6IFwiaHR0cDovLzEyNy4wLjAuMTo4Nzg3XCIsXG4gICAgICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcIi9hcGkvam9iLWRldGFpbHNcIjoge1xuICAgICAgICAgICAgICB0YXJnZXQ6IFwiaHR0cHM6Ly9icmVuZW8tam9iLWFnZ3JlZ2F0b3IudXAucmFpbHdheS5hcHAvXCIsXG4gICAgICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgICAgICAgc2VjdXJlOiBmYWxzZSxcbiAgICAgICAgICAgICAgcmV3cml0ZTogKHBhdGgpID0+IHBhdGgsIC8vIEtlZXAgdGhlIHBhdGggYXMtaXNcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAvLyBQcm94eSBhbGwgb3RoZXIgL2FwaSByZXF1ZXN0cyB0byBicmVuZW8ub25yZW5kZXIuY29tXG4gICAgICAgICAgICBcIi9hcGlcIjoge1xuICAgICAgICAgICAgICB0YXJnZXQ6IFwiaHR0cHM6Ly9icmVuZW8ub25yZW5kZXIuY29tXCIsXG4gICAgICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgICAgICAgc2VjdXJlOiB0cnVlLFxuICAgICAgICAgICAgICBjb25maWd1cmU6IChwcm94eSwgb3B0aW9ucykgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBDT1JTIGhlYWRlcnMgdG8gcHJveGllZCByZXF1ZXN0c1xuICAgICAgICAgICAgICAgIHByb3h5Lm9uKFwicHJveHlSZXFcIiwgKHByb3h5UmVxLCByZXEsIHJlcykgPT4ge1xuICAgICAgICAgICAgICAgICAgcHJveHlSZXEuc2V0SGVhZGVyKFwiT3JpZ2luXCIsIHJlcS5oZWFkZXJzLm9yaWdpbiB8fCBcIlwiKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfVxuICAgICAgICA6IHt9LFxuICB9LFxuICBiYXNlOiBcIi9cIixcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAgbW9kZSA9PT0gXCJkZXZlbG9wbWVudFwiICYmIGNvbXBvbmVudFRhZ2dlcigpLFxuICAgIFZpdGVQV0Eoe1xuICAgICAgcmVnaXN0ZXJUeXBlOiBcInByb21wdFwiLFxuICAgICAgaW5jbHVkZUFzc2V0czogW1wicm9ib3RzLnR4dFwiLCBcImxvdmFibGUtdXBsb2Fkcy8qLnBuZ1wiXSxcbiAgICAgIG1hbmlmZXN0OiB7XG4gICAgICAgIG5hbWU6IFwiQnJlbmVvIC0gQUktUG93ZXJlZCBMZWFybmluZyAmIEpvYiBNYXRjaGluZyBQbGF0Zm9ybVwiLFxuICAgICAgICBzaG9ydF9uYW1lOiBcIkJyZW5lb1wiLFxuICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICBcIkJyZW5lbyBoZWxwcyB1c2VycyBhc3Nlc3MgdGhlaXIgc2tpbGxzLCBleHBsb3JlIGpvYiBvZmZlcnMsIGFuZCBmb2xsb3cgcGVyc29uYWxpemVkIGxlYXJuaW5nIHBhdGhzIHdpdGggQUkgdGVjaG5vbG9neS5cIixcbiAgICAgICAgdGhlbWVfY29sb3I6IFwiI2ZmZmZmZlwiLFxuICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiBcIiNmZmZmZmZcIixcbiAgICAgICAgZGlzcGxheTogXCJzdGFuZGFsb25lXCIsXG4gICAgICAgIG9yaWVudGF0aW9uOiBcInBvcnRyYWl0XCIsXG4gICAgICAgIHNjb3BlOiBcIi9cIixcbiAgICAgICAgc3RhcnRfdXJsOiBcIi9cIixcbiAgICAgICAgaWNvbnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBzcmM6IFwiL2xvdmFibGUtdXBsb2Fkcy9icmVuZW8tZmF2aWNvbi5wbmdcIixcbiAgICAgICAgICAgIHNpemVzOiBcIjE5MngxOTJcIixcbiAgICAgICAgICAgIHR5cGU6IFwiaW1hZ2UvcG5nXCIsXG4gICAgICAgICAgICBwdXJwb3NlOiBcImFueSBtYXNrYWJsZVwiLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgc3JjOiBcIi9sb3ZhYmxlLXVwbG9hZHMvYnJlbmVvLWZhdmljb24ucG5nXCIsXG4gICAgICAgICAgICBzaXplczogXCI1MTJ4NTEyXCIsXG4gICAgICAgICAgICB0eXBlOiBcImltYWdlL3BuZ1wiLFxuICAgICAgICAgICAgcHVycG9zZTogXCJhbnkgbWFza2FibGVcIixcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgICBjYXRlZ29yaWVzOiBbXCJlZHVjYXRpb25cIiwgXCJwcm9kdWN0aXZpdHlcIiwgXCJidXNpbmVzc1wiXSxcbiAgICAgICAgc2hvcnRjdXRzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgbmFtZTogXCJEYXNoYm9hcmRcIixcbiAgICAgICAgICAgIHNob3J0X25hbWU6IFwiRGFzaGJvYXJkXCIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJWaWV3IHlvdXIgZGFzaGJvYXJkXCIsXG4gICAgICAgICAgICB1cmw6IFwiL2Rhc2hib2FyZFwiLFxuICAgICAgICAgICAgaWNvbnM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHNyYzogXCIvbG92YWJsZS11cGxvYWRzL2JyZW5lby1mYXZpY29uLnBuZ1wiLFxuICAgICAgICAgICAgICAgIHNpemVzOiBcIjk2eDk2XCIsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICAgd29ya2JveDoge1xuICAgICAgICBnbG9iUGF0dGVybnM6IFtcIioqLyoue2pzLGNzcyxodG1sLHN2Zyx3b2ZmLHdvZmYyLHR0Zn1cIl0sXG4gICAgICAgIGdsb2JJZ25vcmVzOiBbXG4gICAgICAgICAgXCIqKi9mYXZpY29uLmljb1wiLFxuICAgICAgICAgIFwiKiovbG92YWJsZS11cGxvYWRzL2FjYWRlbXkucG5nXCIsXG4gICAgICAgICAgXCIqKi9sb3ZhYmxlLXVwbG9hZHMvZnV0dXJlLnBuZ1wiLFxuICAgICAgICAgIFwiKiovbG92YWJsZS11cGxvYWRzL3dheS5wbmdcIixcbiAgICAgICAgICBcIioqL2xvdmFibGUtdXBsb2Fkcy9mdWxsLXNob3Qtc3R1ZGVudC1saWJyYXJ5LmpwZ1wiLFxuICAgICAgICBdLFxuICAgICAgICBtYXhpbXVtRmlsZVNpemVUb0NhY2hlSW5CeXRlczogNSAqIDEwMjQgKiAxMDI0LCAvLyA1IE1CXG4gICAgICAgIC8vIEhhbmRsZSBTUEEgcm91dGluZyAtIGZhbGxiYWNrIHRvIGluZGV4Lmh0bWwgZm9yIG5hdmlnYXRpb24gcmVxdWVzdHNcbiAgICAgICAgbmF2aWdhdGVGYWxsYmFjazogXCIvaW5kZXguaHRtbFwiLFxuICAgICAgICBuYXZpZ2F0ZUZhbGxiYWNrRGVueWxpc3Q6IFtcbiAgICAgICAgICAvLyBEb24ndCBmYWxsYmFjayBmb3IgQVBJIHJvdXRlc1xuICAgICAgICAgIC9eXFwvYXBpXFwvLiovLFxuICAgICAgICAgIC8vIERvbid0IGZhbGxiYWNrIGZvciBzdGF0aWMgYXNzZXRzXG4gICAgICAgICAgL1xcLig/OnBuZ3xqcGd8anBlZ3xzdmd8Z2lmfHdlYnB8aWNvfHdvZmZ8d29mZjJ8dHRmfGVvdCkkLyxcbiAgICAgICAgXSxcbiAgICAgICAgLy8gU2tpcCB3YWl0aW5nIGFuZCBjbGFpbSBjbGllbnRzIGZvciBmYXN0ZXIgdXBkYXRlc1xuICAgICAgICBza2lwV2FpdGluZzogdHJ1ZSxcbiAgICAgICAgY2xpZW50c0NsYWltOiB0cnVlLFxuICAgICAgICAvLyBEb24ndCBwcmVjYWNoZSByb3V0ZXMgLSBoYW5kbGUgdGhlbSBhdCBydW50aW1lXG4gICAgICAgIGRvbnRDYWNoZUJ1c3RVUkxzTWF0Y2hpbmc6IC9cXC5cXHd7OH1cXC4vLFxuICAgICAgICBydW50aW1lQ2FjaGluZzogW1xuICAgICAgICAgIC8vIE5ldmVyIGNhY2hlIEFQSSB0cmFmZmljIFx1MjAxNCBhdm9pZHMgQ2FjaGUucHV0IGZhaWx1cmVzIG9uIFBBVENIL1BPU1QgYW5kIHN0YWxlIGF1dGggZGF0YS5cbiAgICAgICAgICB7XG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAoeyB1cmwgfSkgPT4gdXJsLnBhdGhuYW1lLnN0YXJ0c1dpdGgoXCIvYXBpL1wiKSxcbiAgICAgICAgICAgIGhhbmRsZXI6IFwiTmV0d29ya09ubHlcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHVybFBhdHRlcm46IC9eaHR0cHM6XFwvXFwvYnJlbmVvXFwub25yZW5kZXJcXC5jb21cXC9hcGlcXC8vaSxcbiAgICAgICAgICAgIGhhbmRsZXI6IFwiTmV0d29ya09ubHlcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIC8vIEhhbmRsZSBuYXZpZ2F0aW9uIHJlcXVlc3RzIChTUEEgcm91dGVzKVxuICAgICAgICAgICAgdXJsUGF0dGVybjogKHsgcmVxdWVzdCB9KSA9PiByZXF1ZXN0Lm1vZGUgPT09IFwibmF2aWdhdGVcIixcbiAgICAgICAgICAgIGhhbmRsZXI6IFwiTmV0d29ya0ZpcnN0XCIsXG4gICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgIGNhY2hlTmFtZTogXCJwYWdlcy1jYWNoZVwiLFxuICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgbWF4RW50cmllczogNTAsXG4gICAgICAgICAgICAgICAgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0LCAvLyAyNCBob3Vyc1xuICAgICAgICAgICAgICAgIHB1cmdlT25RdW90YUVycm9yOiB0cnVlLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjYWNoZWFibGVSZXNwb25zZToge1xuICAgICAgICAgICAgICAgIHN0YXR1c2VzOiBbMCwgMjAwXSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXFwuKD86cG5nfGpwZ3xqcGVnfHN2Z3xnaWZ8d2VicCkkL2ksXG4gICAgICAgICAgICBoYW5kbGVyOiBcIkNhY2hlRmlyc3RcIixcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgY2FjaGVOYW1lOiBcImltYWdlcy1jYWNoZVwiLFxuICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgbWF4RW50cmllczogMTAwLFxuICAgICAgICAgICAgICAgIG1heEFnZVNlY29uZHM6IDYwICogNjAgKiAyNCAqIDMwLCAvLyAzMCBkYXlzXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgLy8gSGFuZGxlIG1hbmlmZXN0LndlYm1hbmlmZXN0IHJlcXVlc3RzXG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAvbWFuaWZlc3RcXC53ZWJtYW5pZmVzdCQvaSxcbiAgICAgICAgICAgIGhhbmRsZXI6IFwiTmV0d29ya0ZpcnN0XCIsXG4gICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgIGNhY2hlTmFtZTogXCJtYW5pZmVzdC1jYWNoZVwiLFxuICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgbWF4RW50cmllczogMSxcbiAgICAgICAgICAgICAgICBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwICogMjQsIC8vIDI0IGhvdXJzXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgLy8gTm9uLUFQSSBhc3NldHMgb24gQnJlbmVvIG9yaWdpbiAocmFyZSk7IGtlZXAgbmV0d29yay1maXJzdCB3aXRob3V0IG1peGluZyB3aXRoIC9hcGkvLlxuICAgICAgICAgICAgdXJsUGF0dGVybjogKHsgdXJsIH0pID0+XG4gICAgICAgICAgICAgIHVybC5ob3N0bmFtZSA9PT0gXCJicmVuZW8ub25yZW5kZXIuY29tXCIgJiZcbiAgICAgICAgICAgICAgIXVybC5wYXRobmFtZS5zdGFydHNXaXRoKFwiL2FwaS9cIiksXG4gICAgICAgICAgICBoYW5kbGVyOiBcIk5ldHdvcmtGaXJzdFwiLFxuICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICBjYWNoZU5hbWU6IFwiYnJlbmVvLW9yaWdpbi1jYWNoZVwiLFxuICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgbWF4RW50cmllczogMzAsXG4gICAgICAgICAgICAgICAgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0LFxuICAgICAgICAgICAgICAgIHB1cmdlT25RdW90YUVycm9yOiB0cnVlLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjYWNoZWFibGVSZXNwb25zZToge1xuICAgICAgICAgICAgICAgIHN0YXR1c2VzOiBbMCwgMjAwXSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXmh0dHBzOlxcL1xcLy4qXFwuc3VwYWJhc2VcXC5jb1xcLy4qL2ksXG4gICAgICAgICAgICBoYW5kbGVyOiBcIk5ldHdvcmtGaXJzdFwiLFxuICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICBjYWNoZU5hbWU6IFwic3VwYWJhc2UtY2FjaGVcIixcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjoge1xuICAgICAgICAgICAgICAgIG1heEVudHJpZXM6IDUwLFxuICAgICAgICAgICAgICAgIG1heEFnZVNlY29uZHM6IDYwICogNjAgKiAyNCwgLy8gMjQgaG91cnNcbiAgICAgICAgICAgICAgICBwdXJnZU9uUXVvdGFFcnJvcjogdHJ1ZSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY2FjaGVhYmxlUmVzcG9uc2U6IHtcbiAgICAgICAgICAgICAgICBzdGF0dXNlczogWzAsIDIwMF0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICAgLy8gQXZvaWQgV29ya2JveCBDYWNoZSBBUEkgZXJyb3JzIGR1cmluZyBsb2NhbCBkZXYgKFBBVENIIC9hcGksIEhNUiwgbG93IGRpc2sgc3BhY2UpLlxuICAgICAgZGV2T3B0aW9uczoge1xuICAgICAgICBlbmFibGVkOiBmYWxzZSxcbiAgICAgICAgdHlwZTogXCJtb2R1bGVcIixcbiAgICAgIH0sXG4gICAgICAvLyBBZGRpdGlvbmFsIG9wdGlvbnMgdG8gaGFuZGxlIG1pc3Npbmcgcm91dGVzIGdyYWNlZnVsbHlcbiAgICAgIGluamVjdFJlZ2lzdGVyOiBcImF1dG9cIixcbiAgICB9KSxcbiAgXS5maWx0ZXIoQm9vbGVhbiksXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgfSxcbiAgfSxcbiAgZGVmaW5lOiB7XG4gICAgX19BUFBfVkVSU0lPTl9fOiBKU09OLnN0cmluZ2lmeShwYWNrYWdlSnNvbi52ZXJzaW9uIHx8IFwiMC4wLjBcIiksXG4gIH0sXG59KSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQW1RLFNBQVMsb0JBQW9CO0FBQ2hTLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsT0FBTyxRQUFRO0FBQ2YsU0FBUyx1QkFBdUI7QUFDaEMsU0FBUyxlQUFlO0FBTHhCLElBQU0sbUNBQW1DO0FBT3pDLElBQU0sY0FBYyxLQUFLO0FBQUEsRUFDdkIsR0FBRyxhQUFhLEtBQUssUUFBUSxrQ0FBVyxjQUFjLEdBQUcsT0FBTztBQUNsRTtBQUdBLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxPQUFPO0FBQUEsRUFDekMsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBO0FBQUE7QUFBQSxJQUdOLE9BQ0UsU0FBUyxnQkFDTDtBQUFBO0FBQUEsTUFFRSxtQkFBbUI7QUFBQSxRQUNqQixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEs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
