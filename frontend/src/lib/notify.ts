export type NotificationType = "success" | "error" | "info";

export type NotificationPayload = {
  type?: NotificationType;
  message: string;
  durationMs?: number;
};

const NOTIFY_EVENT = "app:notify";

function dispatchNotification(payload: NotificationPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<NotificationPayload>(NOTIFY_EVENT, { detail: payload }));
}

export function notifyInfo(message: string, durationMs?: number) {
  dispatchNotification({ type: "info", message, durationMs });
}

export function notifySuccess(message: string, durationMs?: number) {
  dispatchNotification({ type: "success", message, durationMs });
}

export function notifyError(message: string, durationMs?: number) {
  dispatchNotification({ type: "error", message, durationMs });
}

export function subscribeNotifications(
  callback: (payload: NotificationPayload) => void
) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<NotificationPayload>;
    callback(customEvent.detail);
  };

  window.addEventListener(NOTIFY_EVENT, handler as EventListener);
  return () => window.removeEventListener(NOTIFY_EVENT, handler as EventListener);
}
