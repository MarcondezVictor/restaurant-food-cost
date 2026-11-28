"use client";

import { useEffect, useId, useRef } from "react";
import { Button } from "./Button.tsx";

// Confirms a destructive action, never `window.confirm`. Native <dialog> with
// showModal(): focus stays inside, Esc and "Cancelar" close it. No accent:
// the confirm button is danger, the cancel button is secondary.
export function Dialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  // A question: "Cancelar este convite?"
  title: string;
  // What happens, and that it can be undone when it can.
  message: string;
  // A verb: "Cancelar convite".
  confirmLabel: string;
  cancelLabel?: string;
  // May return a promise: the button shows "Salvando…" until it settles.
  onConfirm: () => unknown;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      aria-labelledby={titleId}
      aria-describedby={messageId}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-card border border-control bg-surface p-4 text-fg backdrop:bg-bg/80"
    >
      <h2 id={titleId} className="text-subtitle font-semibold">
        {title}
      </h2>
      <p id={messageId} className="mt-2 text-body">
        {message}
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <Button variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
      </div>
    </dialog>
  );
}
