// Pick one option by tapping a chip instead of typing (AGENTS.md section
// 9.3). Native radio inputs: works inside a form, with or without JavaScript.
// The picked chip is light on dark, never accent (accent is only for the
// primary button and the current tab).
import { useId } from "react";

export type Choice = { value: string; label: string };

type ChoiceListProps = {
  label: string;
  name: string;
  options: readonly Choice[];
  defaultValue?: string;
  // What to do to fix it, in Portuguese.
  error?: string;
  required?: boolean;
  disabled?: boolean;
};

export function ChoiceList({
  label,
  name,
  options,
  defaultValue,
  error,
  required,
  disabled,
}: ChoiceListProps) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;

  return (
    <fieldset
      className="flex flex-col gap-2"
      aria-describedby={errorId}
      disabled={disabled}
    >
      <legend className="mb-2 text-body font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`inline-flex min-h-tap cursor-pointer items-center rounded-control border px-4 text-body text-fg has-[:checked]:border-fg has-[:checked]:bg-fg has-[:checked]:font-semibold has-[:checked]:text-bg has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-fg ${
              error ? "border-danger" : "border-control"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={option.value === defaultValue}
              required={required}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-body text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
