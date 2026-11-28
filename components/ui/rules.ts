// Pure logic behind the design system components. No React, no imports, so
// `node --test` loads it directly (tests/ui-rules.test.mjs).

// --- Button: one request per tap --------------------------------------------

// A gate that lets one tap through and shuts until it is released.
export type TapGate = { enter(): boolean; release(): void; isOpen(): boolean };

export function createTapGate(): TapGate {
  let busy = false;
  return {
    enter() {
      if (busy) return false;
      busy = true;
      return true;
    },
    release() {
      busy = false;
    },
    isOpen() {
      return !busy;
    },
  };
}

// Wraps an async handler so taps while it runs are ignored. Resolves true
// when this call ran the handler, false when it was ignored.
export function singleFlight<A extends unknown[]>(
  handler: (...args: A) => unknown,
): (...args: A) => Promise<boolean> {
  const gate = createTapGate();
  return async (...args: A) => {
    if (!gate.enter()) return false;
    try {
      await handler(...args);
    } finally {
      gate.release();
    }
    return true;
  };
}

// The submit button's gate. The normal path is <form action={serverAction}>:
// the tap shuts the gate, React reports the form as pending, and the gate
// opens when sending ends. If sending never starts (a form without a server
// action, or an onSubmit that calls preventDefault), the button checks back
// shortly after the tap and opens the gate, so it never stays dead.
export const SUBMIT_START_MS = 1000;

export type SubmitGate = {
  // The person tapped. False when a tap is already in flight.
  tap(): boolean;
  // The form reported pending.
  sendingStarted(): void;
  // The form stopped being pending.
  sendingEnded(): void;
  // Called SUBMIT_START_MS after a tap: opens the gate if sending never began.
  startWindowEnded(): void;
  isOpen(): boolean;
};

export function createSubmitGate(): SubmitGate {
  let state: "open" | "tapped" | "sending" = "open";
  return {
    tap() {
      if (state !== "open") return false;
      state = "tapped";
      return true;
    },
    sendingStarted() {
      state = "sending";
    },
    sendingEnded() {
      state = "open";
    },
    startWindowEnded() {
      if (state === "tapped") state = "open";
    },
    isOpen() {
      return state === "open";
    },
  };
}

// --- Stepper: + / - and quarter fractions -----------------------------------

export const FRACTIONS = [0, 0.25, 0.5, 0.75] as const;
export type Fraction = (typeof FRACTIONS)[number];

export const FRACTION_LABELS: Record<Fraction, string> = {
  0: "0",
  0.25: "¼",
  0.5: "½",
  0.75: "¾",
};

// Avoids 0.1 + 0.2 noise; quantities are stored with 6 decimals.
function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

export function stepValue(
  value: number,
  delta: number,
  min = 0,
  max = Number.POSITIVE_INFINITY,
): number {
  return Math.min(max, Math.max(min, round6(value + delta)));
}

// What the person typed, as a number. Takes a comma or a dot ("2,5" and
// "2.5" are 2.5). Empty or unreadable keeps the previous value; out of range
// is pulled back to min or max.
export function parseQuantity(
  typed: string,
  previous: number,
  min = 0,
  max = Number.POSITIVE_INFINITY,
): number {
  const text = typed.trim().replace(",", ".");
  if (text === "" || !/^-?(\d+\.?\d*|\.\d+)$/.test(text)) return previous;
  return Math.min(max, Math.max(min, round6(Number(text))));
}

// The value as it goes in the input while typing: "2,5", not "2 ½".
export function quantityInputText(value: number): string {
  return String(value).replace(".", ",");
}

// The quarter part of a value, or null when the value is not a whole number
// plus a quarter (a prefilled 2.3 keeps its value; no fraction is picked).
export function fractionOf(value: number): Fraction | null {
  const part = round6(value - Math.floor(value));
  return (FRACTIONS as readonly number[]).includes(part)
    ? (part as Fraction)
    : null;
}

export function withFraction(value: number, fraction: Fraction): number {
  return round6(Math.floor(value) + fraction);
}

// What the person reads: "2", "2 ½", "½", or "2,3" for other decimals.
export function formatQuantity(value: number): string {
  const fraction = fractionOf(value);
  const whole = Math.floor(value);
  if (fraction === null) {
    return value.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
  }
  if (fraction === 0) return String(whole);
  if (whole === 0) return FRACTION_LABELS[fraction];
  return `${whole} ${FRACTION_LABELS[fraction]}`;
}

// --- Toast: only the latest action message ----------------------------------

export type ToastTone = "ok" | "danger";

export type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
  // Present when the action can be undone.
  undo?: () => void;
};

// The screen holds one toast. A new one replaces the old one.
export function showToast(
  _current: ToastItem | null,
  next: ToastItem,
): ToastItem {
  return next;
}

// A success message goes away by itself; an error stays until the person
// closes it, so it is never missed.
export function closesByItself(tone: ToastTone): boolean {
  return tone === "ok";
}

// Closing only applies to the toast that asked for it, so the timer of an
// old toast never closes the one that replaced it.
export function dismissToast(
  current: ToastItem | null,
  id: number,
): ToastItem | null {
  return current !== null && current.id === id ? null : current;
}

// --- StatusBadge: data status -----------------------------------------------

// Code values (AGENTS.md section 7). R5 (#4) wires real data to them.
export const DATA_STATUSES = [
  "real",
  "informed",
  "simulated",
  "missing",
] as const;
export type DataStatus = (typeof DATA_STATUSES)[number];

// What the person reads. `simulated` is "estimado" in kitchen language.
export const STATUS_LABELS: Record<DataStatus, string> = {
  real: "real",
  informed: "informado",
  simulated: "estimado",
  missing: "falta",
};

export type StatusTone = "ok" | "neutral" | "warn" | "danger";

export const STATUS_TONES: Record<DataStatus, StatusTone> = {
  real: "ok",
  informed: "neutral",
  simulated: "warn",
  missing: "danger",
};
