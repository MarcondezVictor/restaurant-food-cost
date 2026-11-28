"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createSubmitGate, singleFlight, SUBMIT_START_MS } from "./rules.ts";

export type ButtonVariant = "primary" | "secondary" | "danger";

const BASE =
  "inline-flex min-h-tap w-full items-center justify-center gap-2 rounded-control px-4 text-body font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-wait aria-disabled:opacity-80";

// Accent is only for the primary button (one per screen). The others are
// outlined.
const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-fg",
  secondary: "border border-control text-fg",
  danger: "border border-danger text-danger",
};

export function buttonClasses(variant: ButtonVariant = "primary"): string {
  return `${BASE} ${VARIANTS[variant]}`;
}

type ButtonProps = {
  variant?: ButtonVariant;
  type?: "button" | "submit";
  // Shown while busy. Kitchen language, ends with "…".
  loadingLabel?: string;
  // Busy from outside (for example a transition the screen controls).
  loading?: boolean;
  disabled?: boolean;
  // May return a promise: taps are ignored until it settles.
  onClick?: () => unknown;
  name?: string;
  value?: string;
  children: React.ReactNode;
};

// One tap, one request.
// - Submit: the normal path is <form action={serverAction}>. The first tap
//   shuts the gate; it opens when the form stops being pending, or after
//   SUBMIT_START_MS if sending never started (a form without a server action,
//   or an onSubmit with preventDefault), so the button never stays dead.
// - onClick: an async handler runs once at a time.
export function Button({
  variant = "primary",
  type = "button",
  loadingLabel = "Salvando…",
  loading = false,
  disabled = false,
  onClick,
  name,
  value,
  children,
}: ButtonProps) {
  const { pending } = useFormStatus();
  const gate = useRef(createSubmitGate());
  const [running, setRunning] = useState(false);
  const run = useRef(
    singleFlight(async (handler: () => unknown) => {
      setRunning(true);
      try {
        await handler();
      } finally {
        setRunning(false);
      }
    }),
  );

  const sending = type === "submit" && pending;
  const busy = loading || sending || running;

  useEffect(() => {
    if (pending) gate.current.sendingStarted();
    else gate.current.sendingEnded();
  }, [pending]);

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    if (busy) {
      event.preventDefault();
      return;
    }
    if (type === "submit") {
      const form = event.currentTarget.form;
      // An invalid form is not sent, so there is nothing to wait for.
      if (form && !form.checkValidity()) return;
      if (!gate.current.tap()) {
        event.preventDefault();
        return;
      }
      const tapped = gate.current;
      setTimeout(() => tapped.startWindowEnded(), SUBMIT_START_MS);
    }
    if (onClick) void run.current(onClick);
  }

  return (
    <button
      type={type}
      name={name}
      value={value}
      disabled={disabled}
      aria-disabled={busy || undefined}
      aria-busy={busy || undefined}
      onClick={handleClick}
      className={buttonClasses(variant)}
    >
      {busy ? loadingLabel : children}
    </button>
  );
}

// A link that looks like a button, for moving to another screen.
export function ButtonLink({
  href,
  variant = "primary",
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={buttonClasses(variant)}>
      {children}
    </Link>
  );
}
