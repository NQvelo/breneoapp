#!/usr/bin/env node
/**
 * Send a manual in-app notification (+ FCM push when configured).
 *
 * Usage:
 *   node scripts/send-notification.mjs --recipient 42 --title "Hello" --message "Test message"
 *   node scripts/send-notification.mjs --all --title "Hello" --message "Everyone gets this"
 *
 * Requires in .env:
 *   NOTIFICATIONS_INTERNAL_KEY
 *   MAIN_API_BASE_URL or VITE_API_BASE_URL (Django host)
 *   FIREBASE_SERVICE_ACCOUNT_PATH (optional, for browser push)
 */
import "dotenv/config";
import { createDjangoNotification } from "../server/djangoNotifications.mjs";

function readArg(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return "";
  return String(process.argv[idx + 1]).trim();
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

const broadcast = hasFlag("--all") || hasFlag("--broadcast") || hasFlag("-a");
const recipientId = readArg("--recipient") || readArg("-r");
const title = readArg("--title") || readArg("-t");
const message = readArg("--message") || readArg("-m");
const type = readArg("--type") || "info";
const kind = readArg("--kind") || "manual";

if ((!broadcast && !recipientId) || !title || !message) {
  console.error(`
Send a notification to one user or everyone (in-app + FCM push).

Usage:
  node scripts/send-notification.mjs --recipient <user_id> --title "<title>" --message "<body>"
  node scripts/send-notification.mjs --all --title "<title>" --message "<body>"

Options:
  --recipient, -r   Django user id (single user)
  --all, --broadcast, -a
                    Send to every user (broadcast in-app + push all FCM tokens)
  --title, -t       Notification title
  --message, -m     Notification body
  --type            info | success | warning | error (default: info)
  --kind            metadata.kind (default: manual)

Examples:
  node scripts/send-notification.mjs -r 42 -t "Breneo update" -m "We added new features!"
  node scripts/send-notification.mjs --all -t "Maintenance" -m "Breneo will be down tonight at 22:00."
`);
  process.exit(1);
}

if (!process.env.NOTIFICATIONS_INTERNAL_KEY?.trim()) {
  console.error("NOTIFICATIONS_INTERNAL_KEY is not set in .env");
  process.exit(1);
}

const result = await createDjangoNotification({
  recipientId: broadcast ? "all" : recipientId,
  broadcast,
  title,
  message,
  type,
  metadata: { kind: broadcast ? "broadcast" : kind },
});

if (result.ok) {
  console.log("Notification sent:", {
    audience: broadcast ? "everyone" : recipientId,
    title,
    status: result.status,
  });
  process.exit(0);
}

console.error("Failed:", result.status, result.data);
process.exit(1);
