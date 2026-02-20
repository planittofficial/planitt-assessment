"use client";

import { useEffect } from "react";
import { violationService } from "@/services/violation.service";
import { useRouter } from "next/navigation";
import { notifyError, notifyInfo } from "@/lib/notify";

export function useViolation(attemptId: string) {
  const router = useRouter();

  useEffect(() => {
    async function handleViolation(type: string, message: string) {
      try {
        const res = await violationService.log(attemptId, type);
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
        handleViolation("FULLSCREEN_EXIT", "Warning: You have exited fullscreen mode. Please stay in fullscreen mode to avoid disqualification. This violation has been recorded.");
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [attemptId]);
}
