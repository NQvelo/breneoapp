/**
 * Mock interview BFF routes — Breneo JWT → job-aggregator with X-Employer-Key + user_id.
 *
 * POST /api/v1/interview/start/
 * POST /api/v1/interview/submit-audio/:questionId/
 */

const INTERVIEW_MULTIPART_MAX_BYTES = 25 * 1024 * 1024;

/**
 * @param {import("express").Express} app
 * @param {{
 *   requireUserAuth: (req: import("express").Request, res: import("express").Response) => Promise<{ userId: string } | null>;
 *   aggregatorBaseUrl: string;
 *   aggregatorKey: string;
 *   readRequestBodyIntoBuffer: (req: import("http").IncomingMessage, maxBytes?: number) => Promise<Buffer>;
 *   parseUpstreamJson: (text: string) => unknown;
 * }} deps
 */
export function registerInterviewRoutes(app, deps) {
  const base = deps.aggregatorBaseUrl.replace(/\/$/, "");

  async function handleInterviewStart(req, res) {
    try {
      const ctx = await deps.requireUserAuth(req, res);
      if (!ctx) return;

      if (!deps.aggregatorKey) {
        return res.status(500).json({
          detail:
            "JOB_AGGREGATOR_EMPLOYER_KEY is not set. Add it to .env and restart the BFF.",
        });
      }

      const raw =
        req.body && typeof req.body === "object" && !Array.isArray(req.body)
          ? /** @type {Record<string, unknown>} */ (req.body)
          : {};
      const jobPosition = String(raw.job_position ?? "").trim();
      const jobIdRaw = raw.job_id;
      const jobId =
        jobIdRaw != null &&
        jobIdRaw !== "" &&
        Number.isFinite(Number(jobIdRaw))
          ? Number(jobIdRaw)
          : null;

      if (jobId == null && !jobPosition) {
        return res.status(400).json({
          detail: "job_id or job_position is required",
        });
      }

      const upstreamBody = {
        user_id: ctx.userId,
        ...(jobId != null ? { job_id: jobId } : {}),
        ...(jobPosition ? { job_position: jobPosition } : {}),
      };

      const upstream = await fetch(`${base}/api/v1/interview/start/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Employer-Key": deps.aggregatorKey,
        },
        body: JSON.stringify(upstreamBody),
      });

      const text = await upstream.text();
      const data = deps.parseUpstreamJson(text);
      if (!upstream.ok) {
        return res
          .status(upstream.status >= 400 ? upstream.status : 502)
          .json(
            typeof data === "object" && data !== null
              ? data
              : { detail: text || "Interview start failed" },
          );
      }

      return res.status(upstream.status).json(data);
    } catch (e) {
      console.error("[interview-routes] start failed:", e);
      return res.status(500).json({ detail: "Internal server error" });
    }
  }

  async function handleInterviewSubmitAudio(req, res) {
    try {
      const ctx = await deps.requireUserAuth(req, res);
      if (!ctx) return;

      if (!deps.aggregatorKey) {
        return res.status(500).json({
          detail:
            "JOB_AGGREGATOR_EMPLOYER_KEY is not set. Add it to .env and restart the BFF.",
        });
      }

      const questionId = encodeURIComponent(
        String(req.params.questionId || "").trim(),
      );
      if (!questionId) {
        return res.status(400).json({ detail: "question_id is required" });
      }

      const contentType = String(req.headers["content-type"] || "").toLowerCase();
      if (!contentType.includes("multipart/form-data")) {
        return res.status(400).json({
          detail: "Content-Type must be multipart/form-data with audio_file",
        });
      }

      let buffer;
      try {
        buffer = await deps.readRequestBodyIntoBuffer(
          req,
          INTERVIEW_MULTIPART_MAX_BYTES,
        );
      } catch (e) {
        const code = /** @type {Error & { code?: string }} */ (e).code;
        const detail =
          code === "PAYLOAD_TOO_LARGE"
            ? "Upload exceeds 25MB limit."
            : "Could not read multipart upload.";
        return res.status(400).json({ detail });
      }

      if (!buffer.length) {
        return res.status(400).json({ detail: "Empty multipart body" });
      }

      if (String(process.env.EMPLOYER_PROXY_DEBUG || "").trim() === "1") {
        console.log("[interview-routes] submit-audio buffered bytes:", {
          questionId,
          userId: ctx.userId,
          bytes: buffer.length,
        });
      }

      const upstreamUrl = new URL(
        `${base}/api/v1/interview/submit-audio/${questionId}/`,
      );
      upstreamUrl.searchParams.set("user_id", ctx.userId);

      const upstream = await fetch(upstreamUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": String(req.headers["content-type"] || ""),
          Accept: "application/json",
          "X-Employer-Key": deps.aggregatorKey,
        },
        body: buffer,
      });

      const text = await upstream.text();
      const data = deps.parseUpstreamJson(text);
      if (!upstream.ok) {
        console.error("[interview-routes] submit-audio upstream error:", {
          status: upstream.status,
          questionId,
          userId: ctx.userId,
          bodyPreview: text.slice(0, 500),
        });
        return res
          .status(upstream.status >= 400 ? upstream.status : 502)
          .json(
            typeof data === "object" && data !== null
              ? data
              : { detail: text || "Interview audio submit failed" },
          );
      }

      return res.status(upstream.status).json(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[interview-routes] submit-audio failed:", msg, e);
      return res.status(500).json({
        detail: `Internal server error${msg ? `: ${msg}` : ""}`,
      });
    }
  }

  app.post("/api/v1/interview/start", handleInterviewStart);
  app.post("/api/v1/interview/start/", handleInterviewStart);
  app.post(
    "/api/v1/interview/submit-audio/:questionId",
    handleInterviewSubmitAudio,
  );
  app.post(
    "/api/v1/interview/submit-audio/:questionId/",
    handleInterviewSubmitAudio,
  );
}
