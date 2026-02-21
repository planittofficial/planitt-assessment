"use client";

import { useEffect } from "react";
import { useState } from "react";
import { violationService } from "@/services/violation.service";
import { useRouter } from "next/navigation";
import { notifyError, notifyInfo } from "@/lib/notify";

export function useViolation(attemptId: string) {
  const router = useRouter();
  const [violationCount, setViolationCount] = useState(0);
  const [requireFullscreen, setRequireFullscreen] = useState(false);

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
      }
    }

    function onVisibilityChange() {
      if (document.hidden) {
        handleViolation("TAB_SWITCH", "Warning: Tab switching is not allowed during the assessment. This violation has been recorded.");
      }
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

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [attemptId, router]);

  return {
    violationCount,
    requireFullscreen,
    requestAssessmentFullscreen,
  };
}
