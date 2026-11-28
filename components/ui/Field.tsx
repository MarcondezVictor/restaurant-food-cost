// A labelled input with its error under it. The error says what to do, in
// Portuguese, never an error code (AGENTS.md section 9.5).
import { useId } from "react";

type FieldProps = {
  label: string;
  name: string;
  // Sentence under the label that helps fill the field.
  hint?: string;
  // What to do to fix it. The field turns red while it is set.
  error?: string;
  type?: "text" | "email" | "tel" | "search" | "password";
  inputMode?: "text" | "email" | "tel" | "numeric" | "decimal" | "search";
  defaultValue?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  maxLength?: number;
  disabled?: boolean;
};

export function Field({
  label,
  name,
  hint,
  error,
  type = "text",
  ...input
}: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-body font-semibold">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-caption text-muted">
          {hint}
        </p>
      )}
      <input
        id={id}
        name={name}
        type={type}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`min-h-tap w-full rounded-control border bg-surface px-3 text-body text-fg placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg disabled:opacity-60 ${
          error ? "border-danger" : "border-control"
        }`}
        {...input}
      />
      {error && (
        <p id={errorId} role="alert" className="text-body text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
