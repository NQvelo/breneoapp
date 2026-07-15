import { describe, expect, it } from "vitest";
import {
  filterInboxNotifications,
  isInboxNotification,
} from "@/api/notifications/inboxNotifications";
import type { Notification } from "@/api/notifications/notificationsApi";

function notification(
  overrides: Partial<Notification> = {},
): Notification {
  return {
    id: "1",
    title: "Test",
    message: "Hello",
    type: "info",
    recipient_id: "42",
    is_read: false,
    kind: "",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("inboxNotifications", () => {
  it("shows manual, broadcast, and job_match notifications", () => {
    expect(isInboxNotification(notification({ kind: "manual" }))).toBe(true);
    expect(isInboxNotification(notification({ kind: "broadcast" }))).toBe(true);
    expect(isInboxNotification(notification({ kind: "job_match" }))).toBe(true);
  });

  it("hides employer join requests from the general inbox", () => {
    expect(
      isInboxNotification(
        notification({
          kind: "employer_join_request",
          metadata: { kind: "employer_join_request" },
        }),
      ),
    ).toBe(false);
  });

  it("filters lists consistently", () => {
    const items = [
      notification({ id: "1", kind: "manual" }),
      notification({ id: "2", kind: "employer_join_request" }),
      notification({ id: "3", kind: "job_match" }),
    ];

    expect(filterInboxNotifications(items).map((item) => item.id)).toEqual([
      "1",
      "3",
    ]);
  });
});
