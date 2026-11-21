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
var employerProxyTarget = `http://127.0.0.1:${process.env.EMPLOYER_PROXY_PORT || "8787"}`;
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
        target: employerProxyTarget,
        changeOrigin: true
      },
      "/api/employer/staff-memberships": {
        target: employerProxyTarget,
        changeOrigin: true
      },
      "/api/employer/access-state": {
        target: employerProxyTarget,
        changeOrigin: true
      },
      "/api/employer/join-requests": {
        target: employerProxyTarget,
        changeOrigin: true
      },
      "/api/employer/member-invites": {
        target: employerProxyTarget,
        changeOrigin: true
      },
      "/api/employer/jobs": {
        target: employerProxyTarget,
        changeOrigin: true
      },
      "/api/academy/course-analytics": {
        target: employerProxyTarget,
        changeOrigin: true
      },
      // Job applications BFF: apply / my applications / withdraw / applicants (Breneo JWT + server secret).
      "/api/app": {
        target: employerProxyTarget,
        changeOrigin: true
      },
      "/api/me/fcm-tokens": {
        target: employerProxyTarget,
        changeOrigin: true
      },
      // Mock interview BFF: start + submit-audio (Breneo JWT + X-Employer-Key server-side).
      "/api/v1/interview": {
        target: employerProxyTarget,
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
    {
      name: "write-version-json",
      closeBundle() {
        fs.writeFileSync(
          path.resolve(__vite_injected_original_dirname, "dist/version.json"),
          `${JSON.stringify({ version: packageJson.version || "0.0.0" })}
`
        );
      }
    },
    VitePWA({
      registerType: "prompt",
      includeAssets: ["robots.txt", "lovable-uploads/*.png"],
      manifest: {
        id: "/",
        name: "Breneo - AI-Powered Learning & Job Matching Platform",
        short_name: "Breneo",
        description: "Breneo helps users assess their skills, explore job offers, and follow personalized learning paths with AI technology.",
        theme_color: "#F3F3F4",
        background_color: "#F3F3F4",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/lovable-uploads/breneo-favicon.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/lovable-uploads/breneo-favicon.png",
            sizes: "490x490",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/lovable-uploads/breneo-favicon.png",
            sizes: "490x490",
            type: "image/png",
            purpose: "maskable"
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
        // Wait for the user to tap "Update app" before activating a new service worker.
        skipWaiting: false,
        clientsClaim: true,
        importScripts: ["/push-sw-handler.js"],
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
      injectRegister: null
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
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvbWFjYm9va3Byby9icmVuZW9hcHBcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9tYWNib29rcHJvL2JyZW5lb2FwcC92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvbWFjYm9va3Byby9icmVuZW9hcHAvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgZnMgZnJvbSBcImZzXCI7XG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tIFwidml0ZS1wbHVnaW4tcHdhXCI7XG5cbmNvbnN0IHBhY2thZ2VKc29uID0gSlNPTi5wYXJzZShcbiAgZnMucmVhZEZpbGVTeW5jKHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwicGFja2FnZS5qc29uXCIpLCBcInV0Zi04XCIpLFxuKSBhcyB7IHZlcnNpb24/OiBzdHJpbmcgfTtcbmNvbnN0IGVtcGxveWVyUHJveHlUYXJnZXQgPSBgaHR0cDovLzEyNy4wLjAuMToke3Byb2Nlc3MuZW52LkVNUExPWUVSX1BST1hZX1BPUlQgfHwgXCI4Nzg3XCJ9YDtcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+ICh7XG4gIHNlcnZlcjoge1xuICAgIGhvc3Q6IFwiOjpcIixcbiAgICBwb3J0OiA4MDgwLFxuICAgIC8vIFx1MjZBMFx1RkUwRiBURU1QT1JBUlkgV09SS0FST1VORDogUHJveHkgQVBJIHJlcXVlc3RzIHRocm91Z2ggZnJvbnRlbmQgKGRldmVsb3BtZW50IG9ubHkpXG4gICAgLy8gVGhpcyBieXBhc3NlcyBDT1JTIGJ1dCBpcyBOT1QgYSBwcm9kdWN0aW9uIHNvbHV0aW9uXG4gICAgcHJveHk6XG4gICAgICBtb2RlID09PSBcImRldmVsb3BtZW50XCJcbiAgICAgICAgPyB7XG4gICAgICAgICAgICAvLyBQdWJsaWMgaW5kdXN0cmllcyBsaXN0IFx1MjAxNCBwcm94eSBzdHJhaWdodCB0byBSYWlsd2F5IHNvIGl0IHdvcmtzIGV2ZW4gaWYgZW1wbG95ZXItam9icy1wcm94eSAoODc4NykgaXMgbm90IHJ1bm5pbmcuXG4gICAgICAgICAgICBcIi9hcGkvaW5kdXN0cmllc1wiOiB7XG4gICAgICAgICAgICAgIHRhcmdldDogXCJodHRwczovL2JyZW5lby1qb2ItYWdncmVnYXRvci51cC5yYWlsd2F5LmFwcFwiLFxuICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgICAgIHNlY3VyZTogdHJ1ZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcIi9hcGkvZW1wbG95ZXIvY29tcGFuaWVzXCI6IHtcbiAgICAgICAgICAgICAgdGFyZ2V0OiBlbXBsb3llclByb3h5VGFyZ2V0LFxuICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCIvYXBpL2VtcGxveWVyL3N0YWZmLW1lbWJlcnNoaXBzXCI6IHtcbiAgICAgICAgICAgICAgdGFyZ2V0OiBlbXBsb3llclByb3h5VGFyZ2V0LFxuICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCIvYXBpL2VtcGxveWVyL2FjY2Vzcy1zdGF0ZVwiOiB7XG4gICAgICAgICAgICAgIHRhcmdldDogZW1wbG95ZXJQcm94eVRhcmdldCxcbiAgICAgICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiL2FwaS9lbXBsb3llci9qb2luLXJlcXVlc3RzXCI6IHtcbiAgICAgICAgICAgICAgdGFyZ2V0OiBlbXBsb3llclByb3h5VGFyZ2V0LFxuICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCIvYXBpL2VtcGxveWVyL21lbWJlci1pbnZpdGVzXCI6IHtcbiAgICAgICAgICAgICAgdGFyZ2V0OiBlbXBsb3llclByb3h5VGFyZ2V0LFxuICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCIvYXBpL2VtcGxveWVyL2pvYnNcIjoge1xuICAgICAgICAgICAgICB0YXJnZXQ6IGVtcGxveWVyUHJveHlUYXJnZXQsXG4gICAgICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcIi9hcGkvYWNhZGVteS9jb3Vyc2UtYW5hbHl0aWNzXCI6IHtcbiAgICAgICAgICAgICAgdGFyZ2V0OiBlbXBsb3llclByb3h5VGFyZ2V0LFxuICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgLy8gSm9iIGFwcGxpY2F0aW9ucyBCRkY6IGFwcGx5IC8gbXkgYXBwbGljYXRpb25zIC8gd2l0aGRyYXcgLyBhcHBsaWNhbnRzIChCcmVuZW8gSldUICsgc2VydmVyIHNlY3JldCkuXG4gICAgICAgICAgICBcIi9hcGkvYXBwXCI6IHtcbiAgICAgICAgICAgICAgdGFyZ2V0OiBlbXBsb3llclByb3h5VGFyZ2V0LFxuICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCIvYXBpL21lL2ZjbS10b2tlbnNcIjoge1xuICAgICAgICAgICAgICB0YXJnZXQ6IGVtcGxveWVyUHJveHlUYXJnZXQsXG4gICAgICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAvLyBNb2NrIGludGVydmlldyBCRkY6IHN0YXJ0ICsgc3VibWl0LWF1ZGlvIChCcmVuZW8gSldUICsgWC1FbXBsb3llci1LZXkgc2VydmVyLXNpZGUpLlxuICAgICAgICAgICAgXCIvYXBpL3YxL2ludGVydmlld1wiOiB7XG4gICAgICAgICAgICAgIHRhcmdldDogZW1wbG95ZXJQcm94eVRhcmdldCxcbiAgICAgICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiL2FwaS9qb2ItZGV0YWlsc1wiOiB7XG4gICAgICAgICAgICAgIHRhcmdldDogXCJodHRwczovL2JyZW5lby1qb2ItYWdncmVnYXRvci51cC5yYWlsd2F5LmFwcC9cIixcbiAgICAgICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aCwgLy8gS2VlcCB0aGUgcGF0aCBhcy1pc1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIC8vIFByb3h5IGFsbCBvdGhlciAvYXBpIHJlcXVlc3RzIHRvIGJyZW5lby5vbnJlbmRlci5jb21cbiAgICAgICAgICAgIFwiL2FwaVwiOiB7XG4gICAgICAgICAgICAgIHRhcmdldDogXCJodHRwczovL2JyZW5lby5vbnJlbmRlci5jb21cIixcbiAgICAgICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgICAgICBzZWN1cmU6IHRydWUsXG4gICAgICAgICAgICAgIGNvbmZpZ3VyZTogKHByb3h5LCBvcHRpb25zKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIENPUlMgaGVhZGVycyB0byBwcm94aWVkIHJlcXVlc3RzXG4gICAgICAgICAgICAgICAgcHJveHkub24oXCJwcm94eVJlcVwiLCAocHJveHlSZXEsIHJlcSwgcmVzKSA9PiB7XG4gICAgICAgICAgICAgICAgICBwcm94eVJlcS5zZXRIZWFkZXIoXCJPcmlnaW5cIiwgcmVxLmhlYWRlcnMub3JpZ2luIHx8IFwiXCIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9XG4gICAgICAgIDoge30sXG4gIH0sXG4gIGJhc2U6IFwiL1wiLFxuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICBtb2RlID09PSBcImRldmVsb3BtZW50XCIgJiYgY29tcG9uZW50VGFnZ2VyKCksXG4gICAge1xuICAgICAgbmFtZTogXCJ3cml0ZS12ZXJzaW9uLWpzb25cIixcbiAgICAgIGNsb3NlQnVuZGxlKCkge1xuICAgICAgICBmcy53cml0ZUZpbGVTeW5jKFxuICAgICAgICAgIHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiZGlzdC92ZXJzaW9uLmpzb25cIiksXG4gICAgICAgICAgYCR7SlNPTi5zdHJpbmdpZnkoeyB2ZXJzaW9uOiBwYWNrYWdlSnNvbi52ZXJzaW9uIHx8IFwiMC4wLjBcIiB9KX1cXG5gLFxuICAgICAgICApO1xuICAgICAgfSxcbiAgICB9LFxuICAgIFZpdGVQV0Eoe1xuICAgICAgcmVnaXN0ZXJUeXBlOiBcInByb21wdFwiLFxuICAgICAgaW5jbHVkZUFzc2V0czogW1wicm9ib3RzLnR4dFwiLCBcImxvdmFibGUtdXBsb2Fkcy8qLnBuZ1wiXSxcbiAgICAgIG1hbmlmZXN0OiB7XG4gICAgICAgIGlkOiBcIi9cIixcbiAgICAgICAgbmFtZTogXCJCcmVuZW8gLSBBSS1Qb3dlcmVkIExlYXJuaW5nICYgSm9iIE1hdGNoaW5nIFBsYXRmb3JtXCIsXG4gICAgICAgIHNob3J0X25hbWU6IFwiQnJlbmVvXCIsXG4gICAgICAgIGRlc2NyaXB0aW9uOlxuICAgICAgICAgIFwiQnJlbmVvIGhlbHBzIHVzZXJzIGFzc2VzcyB0aGVpciBza2lsbHMsIGV4cGxvcmUgam9iIG9mZmVycywgYW5kIGZvbGxvdyBwZXJzb25hbGl6ZWQgbGVhcm5pbmcgcGF0aHMgd2l0aCBBSSB0ZWNobm9sb2d5LlwiLFxuICAgICAgICB0aGVtZV9jb2xvcjogXCIjRjNGM0Y0XCIsXG4gICAgICAgIGJhY2tncm91bmRfY29sb3I6IFwiI0YzRjNGNFwiLFxuICAgICAgICBkaXNwbGF5OiBcInN0YW5kYWxvbmVcIixcbiAgICAgICAgb3JpZW50YXRpb246IFwicG9ydHJhaXRcIixcbiAgICAgICAgc2NvcGU6IFwiL1wiLFxuICAgICAgICBzdGFydF91cmw6IFwiL1wiLFxuICAgICAgICBpY29uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHNyYzogXCIvbG92YWJsZS11cGxvYWRzL2JyZW5lby1mYXZpY29uLnBuZ1wiLFxuICAgICAgICAgICAgc2l6ZXM6IFwiMTkyeDE5MlwiLFxuICAgICAgICAgICAgdHlwZTogXCJpbWFnZS9wbmdcIixcbiAgICAgICAgICAgIHB1cnBvc2U6IFwiYW55XCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBzcmM6IFwiL2xvdmFibGUtdXBsb2Fkcy9icmVuZW8tZmF2aWNvbi5wbmdcIixcbiAgICAgICAgICAgIHNpemVzOiBcIjQ5MHg0OTBcIixcbiAgICAgICAgICAgIHR5cGU6IFwiaW1hZ2UvcG5nXCIsXG4gICAgICAgICAgICBwdXJwb3NlOiBcImFueVwiLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgc3JjOiBcIi9sb3ZhYmxlLXVwbG9hZHMvYnJlbmVvLWZhdmljb24ucG5nXCIsXG4gICAgICAgICAgICBzaXplczogXCI0OTB4NDkwXCIsXG4gICAgICAgICAgICB0eXBlOiBcImltYWdlL3BuZ1wiLFxuICAgICAgICAgICAgcHVycG9zZTogXCJtYXNrYWJsZVwiLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICAgIGNhdGVnb3JpZXM6IFtcImVkdWNhdGlvblwiLCBcInByb2R1Y3Rpdml0eVwiLCBcImJ1c2luZXNzXCJdLFxuICAgICAgICBzaG9ydGN1dHM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBuYW1lOiBcIkRhc2hib2FyZFwiLFxuICAgICAgICAgICAgc2hvcnRfbmFtZTogXCJEYXNoYm9hcmRcIixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlZpZXcgeW91ciBkYXNoYm9hcmRcIixcbiAgICAgICAgICAgIHVybDogXCIvZGFzaGJvYXJkXCIsXG4gICAgICAgICAgICBpY29uczogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgc3JjOiBcIi9sb3ZhYmxlLXVwbG9hZHMvYnJlbmVvLWZhdmljb24ucG5nXCIsXG4gICAgICAgICAgICAgICAgc2l6ZXM6IFwiOTZ4OTZcIixcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICB3b3JrYm94OiB7XG4gICAgICAgIGdsb2JQYXR0ZXJuczogW1wiKiovKi57anMsY3NzLGh0bWwsc3ZnLHdvZmYsd29mZjIsdHRmfVwiXSxcbiAgICAgICAgZ2xvYklnbm9yZXM6IFtcbiAgICAgICAgICBcIioqL2Zhdmljb24uaWNvXCIsXG4gICAgICAgICAgXCIqKi9sb3ZhYmxlLXVwbG9hZHMvYWNhZGVteS5wbmdcIixcbiAgICAgICAgICBcIioqL2xvdmFibGUtdXBsb2Fkcy9mdXR1cmUucG5nXCIsXG4gICAgICAgICAgXCIqKi9sb3ZhYmxlLXVwbG9hZHMvd2F5LnBuZ1wiLFxuICAgICAgICAgIFwiKiovbG92YWJsZS11cGxvYWRzL2Z1bGwtc2hvdC1zdHVkZW50LWxpYnJhcnkuanBnXCIsXG4gICAgICAgICAgXCIqKi9hc3NldHMvZ2VvLXZlbmRvci0qLmpzXCIsXG4gICAgICAgIF0sXG4gICAgICAgIC8vIEtlZXAgc2VydmljZS13b3JrZXIgaW5zdGFsbCBmYXN0IGJ5IHNraXBwaW5nIG92ZXJzaXplZCBvcHRpb25hbCBhc3NldHMuXG4gICAgICAgIG1heGltdW1GaWxlU2l6ZVRvQ2FjaGVJbkJ5dGVzOiAyICogMTAyNCAqIDEwMjQsIC8vIDIgTUJcbiAgICAgICAgLy8gSGFuZGxlIFNQQSByb3V0aW5nIC0gZmFsbGJhY2sgdG8gaW5kZXguaHRtbCBmb3IgbmF2aWdhdGlvbiByZXF1ZXN0c1xuICAgICAgICBuYXZpZ2F0ZUZhbGxiYWNrOiBcIi9pbmRleC5odG1sXCIsXG4gICAgICAgIG5hdmlnYXRlRmFsbGJhY2tEZW55bGlzdDogW1xuICAgICAgICAgIC8vIERvbid0IGZhbGxiYWNrIGZvciBBUEkgcm91dGVzXG4gICAgICAgICAgL15cXC9hcGlcXC8uKi8sXG4gICAgICAgICAgLy8gRG9uJ3QgZmFsbGJhY2sgZm9yIHN0YXRpYyBhc3NldHNcbiAgICAgICAgICAvXFwuKD86cG5nfGpwZ3xqcGVnfHN2Z3xnaWZ8d2VicHxpY298d29mZnx3b2ZmMnx0dGZ8ZW90KSQvLFxuICAgICAgICBdLFxuICAgICAgICAvLyBXYWl0IGZvciB0aGUgdXNlciB0byB0YXAgXCJVcGRhdGUgYXBwXCIgYmVmb3JlIGFjdGl2YXRpbmcgYSBuZXcgc2VydmljZSB3b3JrZXIuXG4gICAgICAgIHNraXBXYWl0aW5nOiBmYWxzZSxcbiAgICAgICAgY2xpZW50c0NsYWltOiB0cnVlLFxuICAgICAgICBpbXBvcnRTY3JpcHRzOiBbXCIvcHVzaC1zdy1oYW5kbGVyLmpzXCJdLFxuICAgICAgICAvLyBEb24ndCBwcmVjYWNoZSByb3V0ZXMgLSBoYW5kbGUgdGhlbSBhdCBydW50aW1lXG4gICAgICAgIGRvbnRDYWNoZUJ1c3RVUkxzTWF0Y2hpbmc6IC9cXC5cXHd7OH1cXC4vLFxuICAgICAgICBydW50aW1lQ2FjaGluZzogW1xuICAgICAgICAgIC8vIE5ldmVyIGNhY2hlIEFQSSB0cmFmZmljIFx1MjAxNCBhdm9pZHMgQ2FjaGUucHV0IGZhaWx1cmVzIG9uIFBBVENIL1BPU1QgYW5kIHN0YWxlIGF1dGggZGF0YS5cbiAgICAgICAgICB7XG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAoeyB1cmwgfSkgPT4gdXJsLnBhdGhuYW1lLnN0YXJ0c1dpdGgoXCIvYXBpL1wiKSxcbiAgICAgICAgICAgIGhhbmRsZXI6IFwiTmV0d29ya09ubHlcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHVybFBhdHRlcm46IC9eaHR0cHM6XFwvXFwvYnJlbmVvXFwub25yZW5kZXJcXC5jb21cXC9hcGlcXC8vaSxcbiAgICAgICAgICAgIGhhbmRsZXI6IFwiTmV0d29ya09ubHlcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIC8vIEhhbmRsZSBuYXZpZ2F0aW9uIHJlcXVlc3RzIChTUEEgcm91dGVzKVxuICAgICAgICAgICAgdXJsUGF0dGVybjogKHsgcmVxdWVzdCB9KSA9PiByZXF1ZXN0Lm1vZGUgPT09IFwibmF2aWdhdGVcIixcbiAgICAgICAgICAgIGhhbmRsZXI6IFwiTmV0d29ya0ZpcnN0XCIsXG4gICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgIGNhY2hlTmFtZTogXCJwYWdlcy1jYWNoZVwiLFxuICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgbWF4RW50cmllczogNTAsXG4gICAgICAgICAgICAgICAgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0LCAvLyAyNCBob3Vyc1xuICAgICAgICAgICAgICAgIHB1cmdlT25RdW90YUVycm9yOiB0cnVlLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjYWNoZWFibGVSZXNwb25zZToge1xuICAgICAgICAgICAgICAgIHN0YXR1c2VzOiBbMCwgMjAwXSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXFwuKD86cG5nfGpwZ3xqcGVnfHN2Z3xnaWZ8d2VicCkkL2ksXG4gICAgICAgICAgICBoYW5kbGVyOiBcIkNhY2hlRmlyc3RcIixcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgY2FjaGVOYW1lOiBcImltYWdlcy1jYWNoZVwiLFxuICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgbWF4RW50cmllczogMTAwLFxuICAgICAgICAgICAgICAgIG1heEFnZVNlY29uZHM6IDYwICogNjAgKiAyNCAqIDMwLCAvLyAzMCBkYXlzXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgdXJsUGF0dGVybjogL1xcLig/OmpzfGNzcykkL2ksXG4gICAgICAgICAgICBoYW5kbGVyOiBcIlN0YWxlV2hpbGVSZXZhbGlkYXRlXCIsXG4gICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgIGNhY2hlTmFtZTogXCJhc3NldHMtY2FjaGVcIixcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjoge1xuICAgICAgICAgICAgICAgIG1heEVudHJpZXM6IDEyMCxcbiAgICAgICAgICAgICAgICBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwICogMjQgKiA3LFxuICAgICAgICAgICAgICAgIHB1cmdlT25RdW90YUVycm9yOiB0cnVlLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjYWNoZWFibGVSZXNwb25zZToge1xuICAgICAgICAgICAgICAgIHN0YXR1c2VzOiBbMCwgMjAwXSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAvLyBIYW5kbGUgbWFuaWZlc3Qud2VibWFuaWZlc3QgcmVxdWVzdHNcbiAgICAgICAgICAgIHVybFBhdHRlcm46IC9tYW5pZmVzdFxcLndlYm1hbmlmZXN0JC9pLFxuICAgICAgICAgICAgaGFuZGxlcjogXCJOZXR3b3JrRmlyc3RcIixcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgY2FjaGVOYW1lOiBcIm1hbmlmZXN0LWNhY2hlXCIsXG4gICAgICAgICAgICAgIGV4cGlyYXRpb246IHtcbiAgICAgICAgICAgICAgICBtYXhFbnRyaWVzOiAxLFxuICAgICAgICAgICAgICAgIG1heEFnZVNlY29uZHM6IDYwICogNjAgKiAyNCwgLy8gMjQgaG91cnNcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAvLyBOb24tQVBJIGFzc2V0cyBvbiBCcmVuZW8gb3JpZ2luIChyYXJlKTsga2VlcCBuZXR3b3JrLWZpcnN0IHdpdGhvdXQgbWl4aW5nIHdpdGggL2FwaS8uXG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAoeyB1cmwgfSkgPT5cbiAgICAgICAgICAgICAgdXJsLmhvc3RuYW1lID09PSBcImJyZW5lby5vbnJlbmRlci5jb21cIiAmJlxuICAgICAgICAgICAgICAhdXJsLnBhdGhuYW1lLnN0YXJ0c1dpdGgoXCIvYXBpL1wiKSxcbiAgICAgICAgICAgIGhhbmRsZXI6IFwiTmV0d29ya0ZpcnN0XCIsXG4gICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgIGNhY2hlTmFtZTogXCJicmVuZW8tb3JpZ2luLWNhY2hlXCIsXG4gICAgICAgICAgICAgIGV4cGlyYXRpb246IHtcbiAgICAgICAgICAgICAgICBtYXhFbnRyaWVzOiAzMCxcbiAgICAgICAgICAgICAgICBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwICogMjQsXG4gICAgICAgICAgICAgICAgcHVyZ2VPblF1b3RhRXJyb3I6IHRydWUsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNhY2hlYWJsZVJlc3BvbnNlOiB7XG4gICAgICAgICAgICAgICAgc3RhdHVzZXM6IFswLCAyMDBdLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHVybFBhdHRlcm46IC9eaHR0cHM6XFwvXFwvLipcXC5zdXBhYmFzZVxcLmNvXFwvLiovaSxcbiAgICAgICAgICAgIGhhbmRsZXI6IFwiTmV0d29ya0ZpcnN0XCIsXG4gICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgIGNhY2hlTmFtZTogXCJzdXBhYmFzZS1jYWNoZVwiLFxuICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgbWF4RW50cmllczogNTAsXG4gICAgICAgICAgICAgICAgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0LCAvLyAyNCBob3Vyc1xuICAgICAgICAgICAgICAgIHB1cmdlT25RdW90YUVycm9yOiB0cnVlLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjYWNoZWFibGVSZXNwb25zZToge1xuICAgICAgICAgICAgICAgIHN0YXR1c2VzOiBbMCwgMjAwXSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICAvLyBBdm9pZCBXb3JrYm94IENhY2hlIEFQSSBlcnJvcnMgZHVyaW5nIGxvY2FsIGRldiAoUEFUQ0ggL2FwaSwgSE1SLCBsb3cgZGlzayBzcGFjZSkuXG4gICAgICBkZXZPcHRpb25zOiB7XG4gICAgICAgIGVuYWJsZWQ6IGZhbHNlLFxuICAgICAgICB0eXBlOiBcIm1vZHVsZVwiLFxuICAgICAgfSxcbiAgICAgIC8vIEFkZGl0aW9uYWwgb3B0aW9ucyB0byBoYW5kbGUgbWlzc2luZyByb3V0ZXMgZ3JhY2VmdWxseVxuICAgICAgaW5qZWN0UmVnaXN0ZXI6IG51bGwsXG4gICAgfSksXG4gIF0uZmlsdGVyKEJvb2xlYW4pLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxuICAgIH0sXG4gIH0sXG4gIGRlZmluZToge1xuICAgIF9fQVBQX1ZFUlNJT05fXzogSlNPTi5zdHJpbmdpZnkocGFja2FnZUpzb24udmVyc2lvbiB8fCBcIjAuMC4wXCIpLFxuICB9LFxuICBidWlsZDoge1xuICAgIG1pbmlmeTogXCJlc2J1aWxkXCIsXG4gICAgdGFyZ2V0OiBcImVzMjAyMFwiLFxuICAgIHNvdXJjZW1hcDogZmFsc2UsXG4gICAgY3NzQ29kZVNwbGl0OiB0cnVlLFxuICAgIG1vZHVsZVByZWxvYWQ6IHtcbiAgICAgIHBvbHlmaWxsOiBmYWxzZSxcbiAgICB9LFxuICAgIGVzYnVpbGQ6IHtcbiAgICAgIGRyb3A6IG1vZGUgPT09IFwicHJvZHVjdGlvblwiID8gW1wiY29uc29sZVwiLCBcImRlYnVnZ2VyXCJdIDogW10sXG4gICAgfSxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzKGlkKSB7XG4gICAgICAgICAgaWYgKCFpZC5pbmNsdWRlcyhcIm5vZGVfbW9kdWxlc1wiKSkgcmV0dXJuO1xuXG4gICAgICAgICAgLy8gS2VlcCBSZWFjdCBzdGFjayBpbiBvbmUgc3RhYmxlIGNodW5rLlxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL3JlYWN0L1wiKSB8fFxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvcmVhY3QtZG9tL1wiKSB8fFxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvc2NoZWR1bGVyL1wiKVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgcmV0dXJuIFwicmVhY3QtdmVuZG9yXCI7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gUm91dGVyICsgZGF0YS9jYWNoZSBsYXllciB1c2VkIG9uIG1vc3QgcGFnZXMuXG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvcmVhY3Qtcm91dGVyL1wiKSB8fFxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvcmVhY3Qtcm91dGVyLWRvbS9cIikgfHxcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL0B0YW5zdGFjay9yZWFjdC1xdWVyeS9cIilcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIHJldHVybiBcInJvdXRpbmctZGF0YS12ZW5kb3JcIjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBIZWF2eSBjaGFydGluZyBsaWJzLlxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcIi9yZWNoYXJ0cy9cIikgfHwgaWQuaW5jbHVkZXMoXCIvZDMtXCIpKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJjaGFydHMtdmVuZG9yXCI7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gQW5pbWF0aW9uIGFuZCAzRCBkZXBlbmRlbmNpZXMgYXJlIGxhcmdlIGFuZCByb3V0ZS1zcGVjaWZpYy5cbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9mcmFtZXItbW90aW9uL1wiKSB8fFxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvdGhyZWUvXCIpIHx8XG4gICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9AcmVhY3QtdGhyZWUvXCIpXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJhbmltYXRpb24tM2QtdmVuZG9yXCI7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gVmVyeSBsYXJnZSB3b3JsZCBjb3VudHJ5L2NpdHkgZGF0YXNldDsga2VlcCBpc29sYXRlZCBhbmQgbGF6eS1sb2FkYWJsZS5cbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCIvY291bnRyeS1zdGF0ZS1jaXR5L1wiKSkge1xuICAgICAgICAgICAgcmV0dXJuIFwiZ2VvLXZlbmRvclwiO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFVJIHByaW1pdGl2ZXMgKFJhZGl4ICsgdXRpbGl0eSB3cmFwcGVycykuXG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvQHJhZGl4LXVpL1wiKSB8fFxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvY21kay9cIikgfHxcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL3ZhdWwvXCIpXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJ1aS12ZW5kb3JcIjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCIvcG9zdGhvZy1qcy9cIikpIHtcbiAgICAgICAgICAgIHJldHVybiBcImFuYWx5dGljcy12ZW5kb3JcIjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCIvQHN1cGFiYXNlL1wiKSB8fCBpZC5pbmNsdWRlcyhcIi9maXJlYmFzZS9cIikpIHtcbiAgICAgICAgICAgIHJldHVybiBcImJhY2tlbmQtdmVuZG9yXCI7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxufSkpO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFtUSxTQUFTLG9CQUFvQjtBQUNoUyxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLE9BQU8sUUFBUTtBQUNmLFNBQVMsdUJBQXVCO0FBQ2hDLFNBQVMsZUFBZTtBQUx4QixJQUFNLG1DQUFtQztBQU96QyxJQUFNLGNBQWMsS0FBSztBQUFBLEVBQ3ZCLEdBQUcsYUFBYSxLQUFLLFFBQVEsa0NBQVcsY0FBYyxHQUFHLE9BQU87QUFDbEU7QUFDQSxJQUFNLHNCQUFzQixvQkFBb0IsUUFBUSxJQUFJLHVCQUF1QixNQUFNO0FBR3pGLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxPQUFPO0FBQUEsRUFDekMsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBO0FBQUE7QUFBQSxJQUdOLE9B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
