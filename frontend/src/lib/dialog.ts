export type ConfirmDialogOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

export type PromptDialogOptions = {
  title?: string;
  message: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  inputPlaceholder?: string;
};

type ConfirmDialogPayload = ConfirmDialogOptions & {
  kind: "confirm";
  resolve: (value: boolean) => void;
};

type PromptDialogPayload = PromptDialogOptions & {
  kind: "prompt";
  resolve: (value: string | null) => void;
};

export type DialogPayload = ConfirmDialogPayload | PromptDialogPayload;

const DIALOG_EVENT = "app:dialog";

function dispatchDialog(payload: DialogPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<DialogPayload>(DIALOG_EVENT, { detail: payload }));
}

export function openConfirmDialog(options: ConfirmDialogOptions) {
  return new Promise<boolean>((resolve) => {
    dispatchDialog({ kind: "confirm", resolve, ...options });
  });
}

export function openPromptDialog(options: PromptDialogOptions) {
  return new Promise<string | null>((resolve) => {
    dispatchDialog({ kind: "prompt", resolve, ...options });
  });
}

export function subscribeDialogs(callback: (payload: DialogPayload) => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<DialogPayload>;
    callback(customEvent.detail);
  };

  window.addEventListener(DIALOG_EVENT, handler as EventListener);
  return () => window.removeEventListener(DIALOG_EVENT, handler as EventListener);
}
