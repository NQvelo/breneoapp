#!/usr/bin/env node
/**
 * Diagnose Firebase / FCM setup for Breneo push notifications.
 *
 * Usage: node scripts/debug-fcm.mjs
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { FCM_BROADCAST_TOPIC } from "../server/fcmNotifications.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function ok(msg) {
  console.log(`  ✅ ${msg}`);
}
function bad(msg) {
  console.log(`  ❌ ${msg}`);
}
function info(msg) {
  console.log(`  • ${msg}`);
}

console.log("\n=== Breneo FCM debug ===\n");

const vapid = process.env.VITE_FIREBASE_VAPID_KEY?.trim() || "";
const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() || "";
const saAbs = saPath ? path.resolve(root, saPath) : "";

console.log("1) Client env (VITE_FIREBASE_*)");
[
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
].forEach((key) => {
  if (process.env[key]?.trim()) ok(`${key} set`);
  else bad(`${key} missing`);
});

if (!vapid) {
  bad("VITE_FIREBASE_VAPID_KEY missing");
} else if (!/^[A-Za-z0-9_-]{80,}$/.test(vapid)) {
  bad(
    `VITE_FIREBASE_VAPID_KEY looks WRONG (length ${vapid.length}). Expected ~87 chars from Firebase → Cloud Messaging → Web Push certificates → Key pair.`,
  );
} else {
  ok(`VITE_FIREBASE_VAPID_KEY looks valid (length ${vapid.length})`);
}

console.log("\n2) Server service account");
if (!saPath) {
  bad("FIREBASE_SERVICE_ACCOUNT_PATH missing");
} else if (!fs.existsSync(saAbs)) {
  bad(`Service account file not found: ${saAbs}`);
} else {
  try {
    const sa = JSON.parse(fs.readFileSync(saAbs, "utf8"));
    ok(`Loaded ${saAbs}`);
    info(`project_id: ${sa.project_id}`);
    info(`client_email: ${sa.client_email}`);
    if (sa.project_id !== process.env.VITE_FIREBASE_PROJECT_ID?.trim()) {
      bad(
        `Service account project (${sa.project_id}) != VITE_FIREBASE_PROJECT_ID (${process.env.VITE_FIREBASE_PROJECT_ID})`,
      );
    } else {
      ok("Service account project matches client project");
    }
  } catch (e) {
    bad(`Could not parse service account JSON: ${e}`);
  }
}

console.log("\n3) Registered device tokens");
const tokensPath = path.join(root, ".data/fcm_tokens.json");
if (!fs.existsSync(tokensPath)) {
  bad("No .data/fcm_tokens.json — no browser has registered an FCM token yet");
  info(
    "Fix: log in as a job seeker → Settings → enable notifications (with a valid VAPID key)",
  );
} else {
  const tokens = JSON.parse(fs.readFileSync(tokensPath, "utf8"));
  const list = Array.isArray(tokens) ? tokens : [];
  if (list.length === 0) {
    bad("Token file exists but is empty");
  } else {
    ok(`${list.length} token(s) stored`);
    for (const row of list.slice(0, 5)) {
      info(
        `userId=${row.userId} platform=${row.platform} updated=${row.updatedAt} token=${String(row.token).slice(0, 18)}…`,
      );
    }
  }
}

console.log("\n4) Server FCM send smoke test");
const { isFcmConfigured, sendFcmBroadcast } = await import(
  "../server/fcmNotifications.mjs"
);
if (!isFcmConfigured()) {
  bad("isFcmConfigured() = false");
} else {
  ok("isFcmConfigured() = true");
  const result = await sendFcmBroadcast({
    title: "Breneo FCM debug",
    message: "Server push smoke test",
    tag: `debug-fcm-${Date.now()}`,
    url: "/notifications?tab=notifications",
  });
  info(JSON.stringify(result));
  if (result.reason === "no_tokens") {
    bad("Push skipped: no registered tokens");
  } else if (result.sent > 0) {
    ok(`Sent ${result.sent} push(es)`);
  } else if (result.reason === "deduped") {
    info("Deduped (same tag recently) — normal");
  } else {
    bad(`Send failed or sent 0: ${JSON.stringify(result)}`);
  }
}

console.log("\n5) Other");
if (process.env.NOTIFICATIONS_INTERNAL_KEY?.trim()) {
  ok("NOTIFICATIONS_INTERNAL_KEY set (needed for scripted in-app notifies)");
} else {
  bad(
    "NOTIFICATIONS_INTERNAL_KEY missing — scripts/send-notification.mjs cannot create Django notifications",
  );
}

console.log("\n=== done ===\n");

console.log("Firebase Console (web push):");
console.log("  1) Users must enable notifications in Breneo Settings (FCM token registered).");
console.log(`  2) Topic broadcast: run node scripts/subscribe-fcm-topics.mjs, then target topic "${FCM_BROADCAST_TOPIC}" in Console.`);
console.log("  3) Test one device: node scripts/list-fcm-tokens.mjs → paste token in Console → Send test message.");
console.log("  Note: Console 'All users' often shows 0 web recipients — use Topic or test token instead.\n");
