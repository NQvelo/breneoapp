/**
 * Hook for managing job notifications
 *
 * Requests browser notification permissions and periodically checks for new jobs
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { checkForNewJobMatches } from "@/services/jobs/jobNotificationService";
import { ApiJob } from "@/api/jobs/types";
import { numericIdToUuid } from "@/lib/utils";

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
    useState<NotificationPermission>("default");
  const [isChecking, setIsChecking] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const checkInProgressRef = useRef(false);

  // Request browser notification permission
  const requestPermission = async (): Promise<boolean> => {
    if (!("Notification" in window)) {
      console.log("This browser does not support notifications");
      return false;
    }

    if (Notification.permission === "granted") {
      setPermission("granted");
      return true;
    }

    if (Notification.permission === "denied") {
      setPermission("denied");
      return false;
    }

    // Request permission
    const result = await Notification.requestPermission();
    setPermission(result);
    return result === "granted";
  };

  // Send browser notification
  const sendBrowserNotification = useCallback(
    (job: ApiJob) => {
      if (permission !== "granted") {
        console.log("Notification permission not granted");
        return;
      }

      const jobTitle = job.job_title || job.title || "New Job";
      const companyName =
        job.employer_name || job.company_name || job.company || "Company";
      const jobId = job.job_id || job.id || "";

      const notification = new Notification("New Job Match! 🎯", {
        body: `${jobTitle} at ${companyName} matches your skills`,
        icon:
          job.employer_logo ||
          job.company_logo ||
          job.logo_url ||
          "/lovable-uploads/Breneo-logo.png",
        badge: "/lovable-uploads/Breneo-logo.png",
        tag: `job-${jobId}`, // Prevent duplicate notifications
        requireInteraction: false,
      });

      // Handle notification click - navigate to jobs page
      notification.onclick = () => {
        window.focus();
        notification.close();
        // Navigate to jobs page (you can customize this)
        window.location.href = "/jobs";
      };

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);
    },
    [permission],
  );

  // Check for new jobs and send notifications
  const checkForNewJobs = useCallback(async () => {
    if (!user?.id || checkInProgressRef.current) {
      return;
    }

    checkInProgressRef.current = true;
    setIsChecking(true);

    try {
      const matchingJobs = await checkForNewJobMatches(user.id);

      // Send browser notifications for each matching job
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

  // Update permission state when it changes
  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Request permission on mount if enabled
  useEffect(() => {
    if (!enabled || !user?.id) return;

    // Only auto-request if permission is default (not yet asked)
    if (Notification.permission === "default") {
      // Don't auto-request - let user explicitly request it via UI
      console.log("Notification permission not yet requested");
    } else if (Notification.permission === "granted") {
      // Permission already granted, do an initial check
      checkForNewJobs();
    }
  }, [enabled, user?.id, checkForNewJobs]);

  // Set up periodic checking
  useEffect(() => {
    if (!enabled || !user?.id || permission !== "granted") {
      return;
    }

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up periodic checking
    intervalRef.current = setInterval(() => {
      checkForNewJobs();
    }, checkInterval);

    // Also check when page becomes visible (user returns to tab)
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
  }, [enabled, user?.id, permission, checkInterval, checkForNewJobs]);

  return {
    permission,
    requestPermission,
    isChecking,
    checkForNewJobs,
  };
};
