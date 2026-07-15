import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { areBrowserNotificationsEnabled } from "@/lib/browserNotifications";
import {
  initFcmForegroundListener,
  refreshFcmTokenIfEnabled,
} from "@/lib/fcmClient";
import { isFirebaseConfigured } from "@/lib/firebase";

export function useFcmNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id || !isFirebaseConfigured()) {
      return;
    }

    void initFcmForegroundListener();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !isFirebaseConfigured() || !areBrowserNotificationsEnabled()) {
      return;
    }

    void refreshFcmTokenIfEnabled().catch((error) => {
      console.warn("[fcm] Failed to refresh token:", error);
    });
  }, [user?.id]);
}
