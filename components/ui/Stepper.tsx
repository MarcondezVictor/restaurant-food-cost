"use client";

import { useId, useState } from "react";
import {
  FRACTION_LABELS,
  FRACTIONS,
  fractionOf,
  parseQuantity,
  quantityInputText,
  stepValue,
  withFraction,
} from "./rules.ts";

type StepperProps = {
  label: string;
  // The form field that carries the value (a plain decimal, "2.5").
  name: string;
  // Start from the previous value, so most counts are one tap (section 9.3).
  defaultValue?: number;
  step?: number;
  min?: number;
  max?: number;
  // Shown after the number: "caixas", "kg", "un".
  unit?: string;
  // Adds the 0, ¼, ½, ¾ picker for opened packages.
  fractions?: boolean;
  disabled?: boolean;
};

const ROUND_BUTTON =
  "inline-flex size-tap shrink-0 items-center justify-center rounded-full border border-control text-subtitle font-semibold text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg disabled:cursor-not-allowed disabled:opacity-60";

const FRACTION_CHIP =
  "inline-flex min-h-tap min-w-tap items-center justify-center rounded-control border border-control px-3 text-body text-fg aria-pressed:border-fg aria-pressed:bg-fg aria-pressed:font-semibold aria-pressed:text-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg disabled:cursor-not-allowed disabled:opacity-60";

// + and − for small changes; tap the number to type it when it is far from
// the previous value (48 items must not cost 47 taps, section 9.8).
export function Stepper({
  label,
  name,
  defaultValue = 0,
  step = 1,
  min = 0,
  max,
  unit,
  fractions = false,
  disabled = false,
}: StepperProps) {
  const upper = max ?? Number.POSITIVE_INFINITY;
  const [value, setValue] = useState(defaultValue);
  // What is in the input while the person types; null when not typing.
  const [typed, setTyped] = useState<string | null>(null);
  const labelId = useId();
  const inputId = useId();
  const fraction = fractionOf(value);

  function change(next: number) {
    setTyped(null);
    setValue(next);
  }

  function commitTyped() {
    if (typed === null) return;
    change(parseQuantity(typed, value, min, upper));
  }

  return (
    <div className="flex flex-col gap-2" role="group" aria-labelledby={labelId}>
      <label id={labelId} htmlFor={inputId} className="text-body font-semibold">
        {label}
      </label>
      <input type="hidden" name={name} value={String(value)} />
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`Diminuir ${label}`}
          disabled={disabled || value <= min}
          onClick={() => change(stepValue(value, -step, min, upper))}
          className={ROUND_BUTTON}
        >
          −
        </button>
        <div className="flex min-w-0 flex-1 items-baseline justify-center gap-2">
          <input
            id={inputId}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            disabled={disabled}
            value={typed ?? quantityInputText(value)}
            onFocus={(event) => {
              setTyped(quantityInputText(value));
              event.currentTarget.select();
            }}
            onChange={(event) => {
              setTyped(event.target.value);
              setValue(parseQuantity(event.target.value, value, min, upper));
            }}
            onBlur={commitTyped}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitTyped();
                event.currentTarget.blur();
              }
            }}
            className="min-h-tap w-full min-w-0 rounded-control border border-control bg-surface text-center text-number font-semibold text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg disabled:opacity-60"
          />
          {unit && (
            <span className="shrink-0 text-body text-muted">{unit}</span>
          )}
        </div>
        <button
          type="button"
          aria-label={`Aumentar ${label}`}
          disabled={disabled || value >= upper}
          onClick={() => change(stepValue(value, step, min, upper))}
          className={ROUND_BUTTON}
        >
          +
        </button>
      </div>
      {fractions && (
        <div className="flex gap-2" role="group" aria-label="Parte aberta">
          {FRACTIONS.map((part) => (
            <button
              key={part}
              type="button"
              aria-pressed={fraction === part}
              disabled={disabled || withFraction(value, part) > upper}
              onClick={() => change(withFraction(value, part))}
              className={FRACTION_CHIP}
            >
              {FRACTION_LABELS[part]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
