"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  closesByItself,
  dismissToast,
  showToast,
  type ToastItem,
  type ToastTone,
} from "./rules.ts";

// Long enough to read the message and reach "Desfazer". Only "ok" toasts
// close by themselves; an error stays until the person closes it.
export const TOAST_MS = 8000;

type ShowToast = (toast: {
  message: string;
  tone?: ToastTone;
  undo?: () => void;
}) => void;

const ToastContext = createContext<ShowToast | null>(null);

// Shows the result of the latest action. A new message replaces the old one,
// so a screen never stacks messages (absorbs that item from #16).
export function useToast(): ShowToast {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast needs a <ToastProvider> above it");
  return show;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<ToastItem | null>(null);
  const nextId = useRef(1);

  const show = useCallback<ShowToast>(({ message, tone = "ok", undo }) => {
    const id = nextId.current++;
    setCurrent((old) => showToast(old, { id, message, tone, undo }));
  }, []);

  useEffect(() => {
    if (!current || !closesByItself(current.tone)) return;
    const id = current.id;
    const timer = setTimeout(
      () => setCurrent((old) => dismissToast(old, id)),
      TOAST_MS,
    );
    return () => clearTimeout(timer);
  }, [current]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <ToastView
        toast={current}
        onClose={(id) => setCurrent((old) => dismissToast(old, id))}
      />
    </ToastContext.Provider>
  );
}

const TONES: Record<ToastTone, string> = {
  ok: "border-ok",
  danger: "border-danger",
};

// Sits above the primary button at the bottom of the screen. The live region
// is always in the page, so screen readers hear each new message.
export function ToastView({
  toast,
  onClose,
}: {
  toast: ToastItem | null;
  onClose: (id: number) => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-20 px-gutter"
    >
      {toast && (
        <div
          className={`pointer-events-auto mx-auto flex max-w-md items-center gap-3 rounded-card border bg-surface py-1 pl-4 pr-1 text-body text-fg ${TONES[toast.tone]}`}
        >
          <p className="min-w-0 flex-1 py-2">{toast.message}</p>
          {toast.undo && (
            <button
              type="button"
              onClick={() => {
                toast.undo?.();
                onClose(toast.id);
              }}
              className="inline-flex min-h-tap shrink-0 items-center rounded-control px-3 font-semibold text-fg underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
            >
              Desfazer
            </button>
          )}
          <button
            type="button"
            aria-label="Fechar aviso"
            onClick={() => onClose(toast.id)}
            className="inline-flex size-tap shrink-0 items-center justify-center rounded-control text-subtitle text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
