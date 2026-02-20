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
  const timeoutMapRef = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    const unsubscribe = subscribeNotifications((payload: NotificationPayload) => {
      const id = nextIdRef.current++;
      const type = payload.type ?? "info";
      const duration = payload.durationMs ?? DEFAULT_DURATION_MS;

      setItems((prev) => [...prev, { id, type, message: payload.message }]);

      const timeoutId = window.setTimeout(() => {
        removeNotification(id);
      }, duration);

      timeoutMapRef.current.set(id, timeoutId);
    });

    return () => {
      unsubscribe();
      timeoutMapRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutMapRef.current.clear();
    };
  }, []);

  const removeNotification = (id: number) => {
    const timeoutId = timeoutMapRef.current.get(id);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutMapRef.current.delete(id);
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[1000] flex justify-center px-4">
      <div className="flex w-full max-w-xl flex-col gap-3">
      {items.map((item) => (
        <div
          key={item.id}
          className={`pointer-events-auto overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-md transition-all ${
            item.type === "success"
              ? "border-emerald-400/40 bg-gradient-to-r from-emerald-950/90 to-emerald-900/70 text-emerald-50"
              : item.type === "error"
                ? "border-rose-400/40 bg-gradient-to-r from-rose-950/90 to-rose-900/70 text-rose-50"
                : "border-sky-400/40 bg-gradient-to-r from-sky-950/90 to-sky-900/70 text-sky-50"
          }`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start justify-between gap-4 px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-lg" aria-hidden="true">
                {item.type === "success" ? "✔" : item.type === "error" ? "!" : "i"}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">
                  {item.type === "success"
                    ? "Success"
                    : item.type === "error"
                      ? "Action Needed"
                      : "Notice"}
                </p>
                <p className="mt-1 text-sm leading-5">{item.message}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeNotification(item.id)}
              className="rounded-full border border-current/40 px-3 py-1 text-xs font-semibold opacity-90 hover:opacity-100"
            >
              OK
            </button>
          </div>
          <div
            className={`h-1 w-full ${
              item.type === "success"
                ? "bg-emerald-300/60"
                : item.type === "error"
                  ? "bg-rose-300/60"
                  : "bg-sky-300/60"
            }`}
          />
        </div>
      ))}
      </div>
    </div>
  );
}

