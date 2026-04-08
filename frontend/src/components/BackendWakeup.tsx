"use client";

import { useEffect } from "react";
import { API_BASE_URL } from "@/lib/api";

const WAKEUP_INTERVAL_MS = 14 * 60 * 1000;

function pingBackend() {
  void fetch(`${API_BASE_URL}/health`, {
    method: "GET",
    cache: "no-store",
  }).catch((error) => {
    console.warn("Backend wake-up ping failed", error);
  });
}

export default function BackendWakeup() {
  useEffect(() => {
    pingBackend();

    const intervalId = window.setInterval(() => {
      pingBackend();
    }, WAKEUP_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return null;
}
