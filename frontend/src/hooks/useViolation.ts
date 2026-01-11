"use client";

import { useEffect } from "react";
import { violationService } from "@/services/violation.service";

export function useViolation(attemptId: number) {
  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden) {
        violationService.log(attemptId, "TAB_SWITCH");
      }
    }

    function onFullscreenChange() {
      if (!document.fullscreenElement) {
        violationService.log(attemptId, "FULLSCREEN_EXIT");
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
