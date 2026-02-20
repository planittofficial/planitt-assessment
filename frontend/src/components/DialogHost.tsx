"use client";

import { useEffect, useMemo, useState } from "react";
import { DialogPayload, subscribeDialogs } from "@/lib/dialog";

export default function DialogHost() {
  const [queue, setQueue] = useState<DialogPayload[]>([]);
  const [inputValue, setInputValue] = useState("");

  const active = queue[0] ?? null;

  useEffect(() => {
    const unsubscribe = subscribeDialogs((payload) => {
      setQueue((prev) => [...prev, payload]);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!active) return;
    if (active.kind === "prompt") {
      setInputValue(active.defaultValue ?? "");
    } else {
      setInputValue("");
    }
  }, [active]);

  const labels = useMemo(() => {
    if (!active) return null;
    return {
      confirm: active.confirmText ?? (active.kind === "prompt" ? "Submit" : "Confirm"),
      cancel: active.cancelText ?? "Cancel",
    };
  }, [active]);

  if (!active || !labels) return null;

  const closeAndShift = () => {
    setQueue((prev) => prev.slice(1));
  };

  const handleCancel = () => {
    if (active.kind === "prompt") {
      active.resolve(null);
    } else {
      active.resolve(false);
    }
    closeAndShift();
  };

  const handleConfirm = () => {
    if (active.kind === "prompt") {
      active.resolve(inputValue);
    } else {
      active.resolve(true);
    }
    closeAndShift();
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-white">{active.title ?? "Confirm Action"}</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-300">{active.message}</p>

        {active.kind === "prompt" && (
          <input
            autoFocus
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={active.inputPlaceholder ?? ""}
            className="mt-4 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2 text-white outline-none ring-yellow-500 focus:ring-2"
          />
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-200 transition-colors hover:bg-neutral-700"
          >
            {labels.cancel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
              active.kind === "confirm" && active.destructive
                ? "bg-red-600 text-white hover:bg-red-500"
                : "bg-yellow-500 text-black hover:bg-yellow-400"
            }`}
          >
            {labels.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
