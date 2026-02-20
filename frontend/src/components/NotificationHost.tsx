"use client";

import { useEffect, useRef, useState } from "react";
import {
  NotificationPayload,
  NotificationType,
  subscribeNotifications,
} from "@/lib/notify";

type NotificationItem = {
  id: number;
  type: NotificationType;
  message: string;
};

const DEFAULT_DURATION_MS = 3500;

export default function NotificationHost() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const nextIdRef = useRef(1);
  const timeoutIdsRef = useRef<number[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeNotifications((payload: NotificationPayload) => {
      const id = nextIdRef.current++;
      const type = payload.type ?? "info";
      const duration = payload.durationMs ?? DEFAULT_DURATION_MS;

      setItems((prev) => [...prev, { id, type, message: payload.message }]);

      const timeoutId = window.setTimeout(() => {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }, duration);

      timeoutIdsRef.current.push(timeoutId);
    });

    return () => {
      unsubscribe();
      timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutIdsRef.current = [];
    };
  }, []);

  const removeNotification = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[1000] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={`pointer-events-auto rounded-lg border px-4 py-3 shadow-xl ${
            item.type === "success"
              ? "border-green-500/40 bg-green-950/90 text-green-100"
              : item.type === "error"
                ? "border-red-500/40 bg-red-950/90 text-red-100"
                : "border-blue-500/40 bg-blue-950/90 text-blue-100"
          }`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm leading-5">{item.message}</p>
            <button
              type="button"
              onClick={() => removeNotification(item.id)}
              className="rounded border border-current/40 px-2 py-0.5 text-xs font-semibold opacity-80 hover:opacity-100"
            >
              Close
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
