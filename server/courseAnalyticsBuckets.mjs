/**
 * Bucket course page views for academy dashboard charts.
 */

/**
 * @param {Date} [d]
 */
export function utcStartOfDay(d = new Date()) {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

/**
 * @param {string} raw
 * @returns {"today" | "yesterday" | "last_7_days"}
 */
export function parseVisitorPeriod(raw) {
  const p = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (p === "today") return "today";
  if (p === "yesterday") return "yesterday";
  return "last_7_days";
}

/**
 * @param {"today" | "yesterday" | "last_7_days"} period
 */
export function visitorPeriodWindow(period) {
  const now = new Date();
  const todayStart = utcStartOfDay(now);

  if (period === "today") {
    return {
      period,
      from: todayStart,
      to: now,
      mode: "hourly7",
    };
  }

  if (period === "yesterday") {
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);
    return {
      period,
      from: yesterdayStart,
      to: todayStart,
      mode: "hourly7",
    };
  }

  const from = new Date(todayStart);
  from.setUTCDate(from.getUTCDate() - 6);
  return {
    period: "last_7_days",
    from,
    to: now,
    mode: "daily7",
  };
}

/**
 * @param {number} n
 */
function pad2(n) {
  return String(n).padStart(2, "0");
}

/**
 * @param {Array<{ viewed_at: string }>} views
 * @param {Date} from
 * @param {Date} to
 */
function bucketHourly7(views, from, to) {
  const startMs = from.getTime();
  const endMs = to.getTime();
  const spanMs = Math.max(endMs - startMs, 1);
  const slotMs = spanMs / 7;

  const buckets = Array.from({ length: 7 }, (_, i) => {
    const slotStart = new Date(startMs + i * slotMs);
    const slotEnd = new Date(startMs + (i + 1) * slotMs);
    const sh = slotStart.getUTCHours();
    const eh = slotEnd.getUTCHours() || 24;
    return {
      label: `${pad2(sh)}h`,
      count: 0,
      slotStartMs: slotStart.getTime(),
      slotEndMs: slotEnd.getTime(),
    };
  });

  for (const row of views) {
    const t = new Date(row.viewed_at).getTime();
    if (!Number.isFinite(t) || t < startMs || t >= endMs) continue;
    const idx = Math.min(6, Math.floor((t - startMs) / slotMs));
    buckets[idx].count += 1;
  }

  return buckets.map(({ label, count }) => ({ label, count }));
}

/**
 * @param {Array<{ viewed_at: string }>} views
 * @param {Date} from
 * @param {Date} to
 */
function bucketDaily7(views, from, to) {
  const dayStarts = [];
  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(from);
    dayStart.setUTCDate(dayStart.getUTCDate() + i);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
    dayStarts.push({
      label: `${pad2(dayStart.getUTCMonth() + 1)}/${pad2(dayStart.getUTCDate())}`,
      count: 0,
      startMs: dayStart.getTime(),
      endMs: dayEnd.getTime(),
    });
  }

  for (const row of views) {
    const t = new Date(row.viewed_at).getTime();
    if (!Number.isFinite(t)) continue;
    for (const bucket of dayStarts) {
      if (t >= bucket.startMs && t < bucket.endMs) {
        bucket.count += 1;
        break;
      }
    }
  }

  return dayStarts.map(({ label, count }) => ({ label, count }));
}

/**
 * @param {Array<{ viewed_at: string }>} views
 * @param {{ from: Date; to: Date; mode: string }} window
 */
export function bucketVisitorViews(views, window) {
  if (window.mode === "daily7") {
    return bucketDaily7(views, window.from, window.to);
  }
  return bucketHourly7(views, window.from, window.to);
}
