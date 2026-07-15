#!/usr/bin/env node
/**
 * Subscribe all stored FCM tokens to the broadcast topic (for Firebase Console).
 *
 * Usage: node scripts/subscribe-fcm-topics.mjs
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  FCM_BROADCAST_TOPIC,
  isFcmConfigured,
  subscribeTokenToBroadcastTopic,
} from "../server/fcmNotifications.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tokensPath = path.resolve(__dirname, "../.data/fcm_tokens.json");

if (!isFcmConfigured()) {
  console.error("FCM not configured. Set FIREBASE_SERVICE_ACCOUNT_PATH in .env");
  process.exit(1);
}

if (!fs.existsSync(tokensPath)) {
  console.error("No .data/fcm_tokens.json — enable notifications in the app first.");
  process.exit(1);
}

const rows = JSON.parse(fs.readFileSync(tokensPath, "utf8"));
const tokens = (Array.isArray(rows) ? rows : [])
  .map((row) => String(row?.token ?? "").trim())
  .filter(Boolean);

if (tokens.length === 0) {
  console.error("No tokens to subscribe.");
  process.exit(1);
}

console.log(`Subscribing ${tokens.length} token(s) to topic "${FCM_BROADCAST_TOPIC}"...\n`);

let ok = 0;
let fail = 0;
for (const token of tokens) {
  const result = await subscribeTokenToBroadcastTopic(token);
  if (result.ok) {
    ok += 1;
    console.log("✅", token.slice(0, 24) + "…");
  } else {
    fail += 1;
    console.log("❌", token.slice(0, 24) + "…", result.reason || result.errors);
  }
}

console.log(`\nDone: ${ok} ok, ${fail} failed`);
console.log(
  `\nFirebase Console: Messaging → Create campaign → Target → Topic → "${FCM_BROADCAST_TOPIC}"`,
);
