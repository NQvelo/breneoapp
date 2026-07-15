#!/usr/bin/env node
/**
 * Print registered FCM tokens for Firebase Console "Send test message".
 *
 * Usage: node scripts/list-fcm-tokens.mjs
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { FCM_BROADCAST_TOPIC } from "../server/fcmNotifications.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tokensPath = path.resolve(__dirname, "../.data/fcm_tokens.json");

if (!fs.existsSync(tokensPath)) {
  console.log("No tokens yet. Enable notifications in Breneo Settings first.");
  process.exit(0);
}

const rows = JSON.parse(fs.readFileSync(tokensPath, "utf8"));
const list = Array.isArray(rows) ? rows : [];

if (list.length === 0) {
  console.log("Token file is empty. Re-enable notifications in Settings.");
  process.exit(0);
}

console.log(`\nFCM broadcast topic (Firebase Console → Target → Topic): ${FCM_BROADCAST_TOPIC}\n`);
console.log("Copy a token below into Firebase Console → Messaging → Send test message:\n");

for (const row of list) {
  console.log(`userId=${row.userId} platform=${row.platform}`);
  console.log(row.token);
  console.log("");
}
