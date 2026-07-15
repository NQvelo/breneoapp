/**
 * FCM token registration routes (BFF).
 * POST /api/me/fcm-tokens — register device token
 * DELETE /api/me/fcm-tokens — remove device token
 *
 * @param {import("express").Express} app
 * @param {{
 *   requireUserAuth: (
 *     req: import("express").Request,
 *     res: import("express").Response,
 *   ) => Promise<{ userId: string } | null>;
 * }} deps
 */
export function registerFcmRoutes(app, deps) {
  const { requireUserAuth } = deps;

  async function handleRegisterFcmToken(req, res) {
    try {
      const ctx = await requireUserAuth(req, res);
      if (!ctx) return;

      const token = String(req.body?.token ?? "").trim();
      if (!token) {
        return res.status(400).json({
          success: false,
          message: "token is required",
          data: null,
          error: "invalid_request",
        });
      }

      const platform = String(req.body?.platform ?? "web").trim() || "web";
      const { upsertFcmToken } = await import("./fcmTokenStore.mjs");
      await upsertFcmToken(ctx.userId, token, platform);

      return res.status(200).json({
        success: true,
        message: "FCM token registered",
        data: { registered: true },
      });
    } catch (e) {
      console.error("[fcm] register token error:", e);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        data: null,
        error: "server_error",
      });
    }
  }

  async function handleDeleteFcmToken(req, res) {
    try {
      const ctx = await requireUserAuth(req, res);
      if (!ctx) return;

      const token = String(req.body?.token ?? "").trim();
      if (!token) {
        return res.status(400).json({
          success: false,
          message: "token is required",
          data: null,
          error: "invalid_request",
        });
      }

      const { removeFcmToken } = await import("./fcmTokenStore.mjs");
      await removeFcmToken(token);

      return res.status(200).json({
        success: true,
        message: "FCM token removed",
        data: { removed: true },
      });
    } catch (e) {
      console.error("[fcm] delete token error:", e);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        data: null,
        error: "server_error",
      });
    }
  }

  app.post("/api/me/fcm-tokens", handleRegisterFcmToken);
  app.post("/api/me/fcm-tokens/", handleRegisterFcmToken);
  app.delete("/api/me/fcm-tokens", handleDeleteFcmToken);
  app.delete("/api/me/fcm-tokens/", handleDeleteFcmToken);
}
