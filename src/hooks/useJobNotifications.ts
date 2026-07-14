/**
 * Hook for managing job notifications
 *
 * Requests browser notification permissions and periodically checks for new jobs
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { checkForNewJobMatches } from "@/services/jobs/jobNotificationService";
import { ApiJob } from "@/api/jobs/types";
import {
  areBrowserNotificationsEnabled,
  getBrowserNotificationPermission,
  getPushNotificationsPreference,
  PUSH_NOTIFICATIONS_CHANGED_EVENT,
  requestBrowserNotificationPermission,
  showBrowserNotification,
} from "@/lib/browserNotifications";

interface UseJobNotificationsOptions {
  enabled?: boolean;
  checkInterval?: number; // in milliseconds, default 30 minutes
}

export const useJobNotifications = (
  options: UseJobNotificationsOptions = {},
) => {
  const { user } = useAuth();
  const { enabled = true, checkInterval = 30 * 60 * 1000 } = options; // Default: 30 minutes
  const [permission, setPermission] =
    useState<NotificationPermission>(getBrowserNotificationPermission);
  const [pushEnabled, setPushEnabled] = useState(getPushNotificationsPreference);
  const [isChecking, setIsChecking] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const checkInProgressRef = useRef(false);

  const requestPermission = async (): Promise<boolean> => {
    const result = await requestBrowserNotificationPermission();
    setPermission(result);
    return result === "granted";
  };

  const sendBrowserNotification = useCallback((job: ApiJob) => {
    if (!areBrowserNotificationsEnabled()) {
      return;
    }

    const jobTitle = job.job_title || job.title || "New Job";
    const companyName =
      job.employer_name || job.company_name || job.company || "Company";
    const jobId = job.job_id || job.id || "";

    showBrowserNotification({
      title: "New Job Match! 🎯",
      body: `${jobTitle} at ${companyName} matches your skills`,
      icon:
        job.employer_logo ||
        job.company_logo ||
        job.logo_url ||
        "/lovable-uploads/Breneo-logo.png",
      tag: `job-${jobId}`,
      onClick: () => {
        window.location.href = "/jobs";
      },
    });
  }, []);

  const checkForNewJobs = useCallback(async () => {
    if (!user?.id || checkInProgressRef.current) {
      return;
    }

    checkInProgressRef.current = true;
    setIsChecking(true);

    try {
      const matchingJobs = await checkForNewJobMatches(user.id);

      for (const job of matchingJobs) {
        sendBrowserNotification(job);
      }

      if (matchingJobs.length > 0) {
        console.log(`Sent ${matchingJobs.length} job notifications`);
      }
    } catch (error) {
      console.error("Error checking for new jobs:", error);
    } finally {
      setIsChecking(false);
      checkInProgressRef.current = false;
    }
  }, [user?.id, sendBrowserNotification]);

  useEffect(() => {
    setPermission(getBrowserNotificationPermission());
  }, []);

  useEffect(() => {
    const syncPushPreference = () => {
      setPushEnabled(getPushNotificationsPreference());
      setPermission(getBrowserNotificationPermission());
    };

    window.addEventListener("focus", syncPushPreference);
    document.addEventListener("visibilitychange", syncPushPreference);
    window.addEventListener(PUSH_NOTIFICATIONS_CHANGED_EVENT, syncPushPreference);

    return () => {
      window.removeEventListener("focus", syncPushPreference);
      document.removeEventListener("visibilitychange", syncPushPreference);
      window.removeEventListener(
        PUSH_NOTIFICATIONS_CHANGED_EVENT,
        syncPushPreference,
      );
    };
  }, []);

  const browserNotificationsActive = permission === "granted" && pushEnabled;

  useEffect(() => {
    if (!enabled || !user?.id) return;

    if (browserNotificationsActive) {
      checkForNewJobs();
    }
  }, [enabled, user?.id, browserNotificationsActive, checkForNewJobs]);

  useEffect(() => {
    if (!enabled || !user?.id || !browserNotificationsActive) {
      return;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      checkForNewJobs();
    }, checkInterval);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkForNewJobs();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, user?.id, browserNotificationsActive, checkInterval, checkForNewJobs]);

  return {
    permission,
    requestPermission,
    isChecking,
    checkForNewJobs,
  };
};
