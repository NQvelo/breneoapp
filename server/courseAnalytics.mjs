/**
 * Academy course page-view analytics (Supabase when configured, local file fallback).
 */
import {
  hasSupabaseServiceRole,
  supabaseExactCount,
  supabaseRest,
} from "./supabaseAdmin.mjs";
import {
  bucketVisitorViews,
  parseVisitorPeriod,
  visitorPeriodWindow,
} from "./courseAnalyticsBuckets.mjs";
import {
  countCourseViewsFromFile,
  listCourseViewsFromFile,
  recordCourseViewToFile,
} from "./courseViewStore.mjs";

function sanitizeCourseId(raw) {
  const id = String(raw ?? "").trim();
  if (!id || id.length > 128) return "";
  return id;
}

/**
 * @param {string} courseId
 */
async function countViewsFromSupabase(courseId) {
  const encoded = encodeURIComponent(courseId);
  const counted = await supabaseExactCount(
    `course_page_views?course_id=eq.${encoded}&select=id`,
  );
  return counted.ok ? counted.count : 0;
}

/**
 * @param {string} courseId
 * @param {string | null} viewerUserId
 */
async function recordViewToSupabase(courseId, viewerUserId) {
  const inserted = await supabaseRest("course_page_views", {
    method: "POST",
    body: JSON.stringify({
      course_id: courseId,
      viewer_user_id: viewerUserId,
    }),
  });
  return inserted.ok;
}

/**
 * @param {import("express").Express} app
 * @param {{
 *   mainApiBase: string;
 *   extractUserIdFromBearerJwt: (authHeader: string) => string | null;
 * }} deps
 */
export function registerCourseAnalyticsRoutes(app, deps) {
  async function requireAcademyAuth(req, res) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      res.status(401).json({ detail: "Authentication required." });
      return null;
    }
    const profRes = await fetch(`${deps.mainApiBase}/api/academy/profile/`, {
      headers: {
        Authorization: auth,
        Accept: "application/json",
      },
    });
    if (!profRes.ok) {
      res.status(401).json({ detail: "Academy authentication failed." });
      return null;
    }
    const profile = await profRes.json().catch(() => ({}));
    const academyName = String(
      profile?.name ?? profile?.academy_name ?? "",
    ).trim();
    if (!academyName) {
      res.status(403).json({ detail: "Academy profile is incomplete." });
      return null;
    }
    return { auth, academyName };
  }

  async function fetchCourseForAuth(auth, courseId) {
    const res = await fetch(
      `${deps.mainApiBase}/api/courses/${encodeURIComponent(courseId)}/`,
      {
        headers: {
          Authorization: auth,
          Accept: "application/json",
        },
      },
    );
    if (!res.ok) {
      return { ok: false, status: res.status, course: null };
    }
    const course = await res.json().catch(() => null);
    return { ok: true, status: res.status, course };
  }

  async function assertAcademyOwnsCourse(authCtx, courseId, res) {
    const loaded = await fetchCourseForAuth(authCtx.auth, courseId);
    if (!loaded.ok) {
      res
        .status(loaded.status === 404 ? 404 : 502)
        .json({ detail: "Course not found." });
      return false;
    }
    const courseAcademy = String(loaded.course?.academy_name ?? "").trim();
    if (!courseAcademy || courseAcademy !== authCtx.academyName) {
      res.status(403).json({ detail: "You do not manage this course." });
      return false;
    }
    return true;
  }

  async function countViews(courseId) {
    if (hasSupabaseServiceRole()) {
      return countViewsFromSupabase(courseId);
    }
    return countCourseViewsFromFile(courseId);
  }

  async function fetchAcademyCourseIds(auth, academyName) {
    const url = new URL(`${deps.mainApiBase}/api/courses/`);
    url.searchParams.set("academy_name", academyName);
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: auth,
        Accept: "application/json",
      },
    });
    if (!res.ok) return [];
    const data = await res.json().catch(() => []);
    if (!Array.isArray(data)) return [];
    return data
      .map((row) => (row && typeof row === "object" ? row.id : null))
      .filter((id) => id != null && String(id).trim() !== "")
      .map((id) => String(id).trim());
  }

  /**
   * @param {string[]} courseIds
   * @param {Date} from
   * @param {Date} to
   */
  async function listViewsFromSupabase(courseIds, from, to) {
    if (!courseIds.length || !hasSupabaseServiceRole()) return [];
    const inList = courseIds
      .map((id) => `"${String(id).trim().replace(/"/g, "")}"`)
      .join(",");
    const fromIso = encodeURIComponent(from.toISOString());
    const toIso = encodeURIComponent(to.toISOString());
    const path =
      `course_page_views?course_id=in.(${inList})` +
      `&viewed_at=gte.${fromIso}&viewed_at=lt.${toIso}` +
      `&select=course_id,viewed_at&order=viewed_at.asc`;
    const result = await supabaseRest(path, { method: "GET" });
    if (!result.ok || !Array.isArray(result.data)) return [];
    return result.data
      .filter((row) => row && typeof row === "object")
      .map((row) => ({
        course_id: String(row.course_id ?? ""),
        viewed_at: String(row.viewed_at ?? ""),
      }));
  }

  /**
   * @param {string[]} courseIds
   * @param {Date} from
   * @param {Date} to
   */
  async function listViewsForCourses(courseIds, from, to) {
    if (hasSupabaseServiceRole()) {
      return listViewsFromSupabase(courseIds, from, to);
    }
    return listCourseViewsFromFile(courseIds, from, to);
  }

  async function recordView(courseId, viewerUserId) {
    if (hasSupabaseServiceRole()) {
      const ok = await recordViewToSupabase(courseId, viewerUserId);
      if (ok) return { storage: "supabase" };
    }
    await recordCourseViewToFile(courseId, viewerUserId);
    return { storage: "file" };
  }

  const handleVisitorOverview = async (req, res) => {
    const authCtx = await requireAcademyAuth(req, res);
    if (!authCtx) return;

    const period = parseVisitorPeriod(req.query.period);
    const window = visitorPeriodWindow(period);

    try {
      const courseIds = await fetchAcademyCourseIds(
        authCtx.auth,
        authCtx.academyName,
      );
      const views = await listViewsForCourses(
        courseIds,
        window.from,
        window.to,
      );
      const buckets = bucketVisitorViews(views, window);
      const totalViews = buckets.reduce((sum, b) => sum + b.count, 0);

      return res.json({
        period: window.period,
        total_views: totalViews,
        buckets,
        course_count: courseIds.length,
        storage: hasSupabaseServiceRole() ? "supabase" : "file",
      });
    } catch (err) {
      console.error("[course-analytics] overview failed:", err);
      return res.status(500).json({ detail: "Could not load visitor overview." });
    }
  };

  const handleRecordView = async (req, res) => {
    const courseId = sanitizeCourseId(req.params.courseId);
    if (!courseId) {
      return res.status(400).json({ detail: "Invalid course id." });
    }

    let viewerUserId = null;
    const auth = req.headers.authorization;
    if (auth?.startsWith("Bearer ")) {
      viewerUserId = deps.extractUserIdFromBearerJwt(auth);
    }

    try {
      const stored = await recordView(courseId, viewerUserId);
      const viewCount = await countViews(courseId);
      return res.status(201).json({
        ok: true,
        view_count: viewCount,
        storage: stored.storage,
      });
    } catch (err) {
      console.error("[course-analytics] record view failed:", err);
      return res.status(500).json({ detail: "Could not record course view." });
    }
  };

  const handleGetAnalytics = async (req, res) => {
    const courseId = sanitizeCourseId(req.params.courseId);
    if (!courseId) {
      return res.status(400).json({ detail: "Invalid course id." });
    }
    const authCtx = await requireAcademyAuth(req, res);
    if (!authCtx) return;
    const allowed = await assertAcademyOwnsCourse(authCtx, courseId, res);
    if (!allowed) return;

    const loaded = await fetchCourseForAuth(authCtx.auth, courseId);
    const enrolled = Array.isArray(loaded.course?.enrolled_users)
      ? loaded.course.enrolled_users
      : [];
    const viewCount = await countViews(courseId);

    return res.json({
      course_id: courseId,
      view_count: viewCount,
      registered_count: enrolled.length,
      storage: hasSupabaseServiceRole() ? "supabase" : "file",
    });
  };

  app.get(
    "/api/academy/course-analytics/overview",
    handleVisitorOverview,
  );
  app.get(
    "/api/academy/course-analytics/overview/",
    handleVisitorOverview,
  );

  app.post(
    "/api/academy/course-analytics/:courseId/view",
    handleRecordView,
  );
  app.post(
    "/api/academy/course-analytics/:courseId/view/",
    handleRecordView,
  );
  app.get("/api/academy/course-analytics/:courseId", handleGetAnalytics);
  app.get("/api/academy/course-analytics/:courseId/", handleGetAnalytics);
}
