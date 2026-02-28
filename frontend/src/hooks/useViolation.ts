"use client";

import { useEffect } from "react";
import { useRef, useState } from "react";
import { violationService } from "@/services/violation.service";
import { useRouter } from "next/navigation";
import { notifyError, notifyInfo } from "@/lib/notify";

export function useViolation(attemptId: string) {
  const router = useRouter();
  const [violationCount, setViolationCount] = useState(0);
  const [requireFullscreen, setRequireFullscreen] = useState(false);
  const lastViolationAtRef = useRef(0);
  const isLoggingRef = useRef(false);

  async function requestAssessmentFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.error("Failed to enter fullscreen", error);
      notifyError("Please allow fullscreen mode to continue the assessment.");
    }
  }

  useEffect(() => {
    if (!attemptId) return;

    violationService
      .getCount(attemptId)
      .then((res) => setViolationCount(Number(res?.violationCount || 0)))
      .catch((err) => {
        console.error("Failed to fetch violation count", err);
      });

    async function handleViolation(type: string, message: string) {
      if (isLoggingRef.current) return;

      const now = Date.now();
      // Multiple browser events can fire for one tab switch; keep one record.
      if (now - lastViolationAtRef.current < 1500) return;

      isLoggingRef.current = true;
      lastViolationAtRef.current = now;

      try {
        const res = await violationService.log(attemptId, type);
        const latestCount = Number(res?.violationCount || 0);
        setViolationCount(latestCount);
        notifyInfo(message);
        
        if (res.autoSubmitted) {
          notifyError(
            `Your assessment has been automatically submitted due to: ${
              res.reason || "Maximum violations reached"
            }.`
          );
          router.push("/results");
        }
      } catch (err) {
        console.error("Failed to log violation", err);
        notifyError("Could not record violation due to a network/server issue.");
      } finally {
        isLoggingRef.current = false;
      }
    }

    function onVisibilityChange() {
      if (document.hidden) {
        handleViolation("TAB_SWITCH", "Warning: Tab switching is not allowed during the assessment. This violation has been recorded.");
      }
    }

    function onWindowBlur() {
      if (document.hidden) return;
      handleViolation("WINDOW_BLUR", "Warning: Focus left the assessment window. This violation has been recorded.");
    }

    function onPageHide() {
      handleViolation("PAGE_HIDE", "Warning: Leaving the assessment page is not allowed. This violation has been recorded.");
    }

    function onFullscreenChange() {
      if (!document.fullscreenElement) {
        setRequireFullscreen(true);
        handleViolation("FULLSCREEN_EXIT", "Warning: You have exited fullscreen mode. Please stay in fullscreen mode to avoid disqualification. This violation has been recorded.");
      } else {
        setRequireFullscreen(false);
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("blur", onWindowBlur);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("blur", onWindowBlur);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [attemptId, router]);

  return {
    violationCount,
    requireFullscreen,
    requestAssessmentFullscreen,
  };
}
