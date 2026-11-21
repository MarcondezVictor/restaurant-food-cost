// Small layout pieces for the core screens, built on theme tokens only.
// R4 replaces these with the design system in components/ui/.
import Link from "next/link";
import type { ActionResult } from "../types.ts";

export const buttonClass =
  "inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-accent px-4 text-base font-semibold text-accent-fg disabled:opacity-60";

export const secondaryButtonClass =
  "inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-border px-4 text-base text-fg disabled:opacity-60";

export const inputClass =
  "min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-base text-fg placeholder:text-muted";

export function Screen({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {children}
    </main>
  );
}

export function Message({ result }: { result: ActionResult }) {
  if (result.status === "idle") return null;
  return (
    <p
      role={result.status === "error" ? "alert" : "status"}
      className={
        result.status === "error"
          ? "rounded-lg border border-danger p-3 text-danger"
          : "rounded-lg border border-ok p-3 text-ok"
      }
    >
      {result.message}
    </p>
  );
}

export function TextLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center text-base text-accent underline"
    >
      {children}
    </Link>
  );
}
