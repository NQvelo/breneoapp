/**
 * Single Railway/production process: Vite `dist/` + employer jobs BFF.
 *
 * The browser must NOT call https://breneo-job-aggregator.up.railway.app directly
 * (no X-Employer-Key in the client). Same-origin /api/industries, /api/employer/companies,
 * /api/employer/jobs are handled here
 * and forwarded to JOB_AGGREGATOR_BASE_URL (default: job aggregator on Railway).
 *
 * Railway: Build = `npm run build`, Start = `npm start`.
 * Env: JOB_AGGREGATOR_EMPLOYER_KEY; MAIN_API_BASE_URL (main Breneo API, same as VITE_API_BASE_URL);
 *   JOB_AGGREGATOR_BASE_URL (or VITE_JOB_AGGREGATOR_BASE_URL / VITE_JOB_API_BASE_URL) for job aggregator; GEMINI_* optional.
 */
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import { app as employerJobsApp } from "./employer-jobs-proxy.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, "../dist");

const root = express();

// Static first so GET / and /assets/* work; /api/* falls through when no file matches.
root.use(express.static(dist));
root.use(employerJobsApp);

root.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return next();
  }
  if (req.path.startsWith("/api")) {
    return next();
  }
  res.sendFile(path.join(dist, "index.html"), (err) => {
    if (err) next(err);
  });
});

root.use((req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ detail: "Not found" });
  }
  res.status(404).send("Not found");
});

const port = Number(process.env.PORT || 8080);
root.listen(port, "0.0.0.0", () => {
  console.log(
    `[production] http://0.0.0.0:${port} static=${dist} + aggregator BFF (/api/industries, /api/employer/companies, /api/employer/jobs)`,
  );
});
