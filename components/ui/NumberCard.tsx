// A number with what it means (AGENTS.md section 9.2): label, data status,
// the big number, one sentence of meaning and, when it is estimated, why.
// A missing number is never drawn as a number (golden rule 2).
import { InfoHint } from "./InfoHint.tsx";
import type { DataStatus } from "./rules.ts";
import { StatusBadge } from "./StatusBadge.tsx";

type Base = {
  label: string;
  // One sentence that says what the number means.
  meaning: string;
  // Optional sentence behind the "i" button.
  hint?: string;
};

// The type refuses impossible cards:
// - "missing" if and only if there is no value (value is null);
// - an estimated number must say why it is estimated.
// `value` comes already formatted ("R$ 1.234,56", "28%").
export type NumberCardProps = Base &
  (
    | { status: "missing"; value: null; reason?: never }
    | { status: "simulated"; value: string; reason: string }
    | {
        status: Exclude<DataStatus, "missing" | "simulated">;
        value: string;
        reason?: never;
      }
  );

export function NumberCard(props: NumberCardProps) {
  const { label, meaning, hint, status } = props;

  return (
    <section className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-body font-semibold">{label}</h2>
          <StatusBadge status={status} />
        </div>
        {hint && <InfoHint label={label}>{hint}</InfoHint>}
      </div>
      {props.status === "missing" ? (
        <p className="text-subtitle text-muted">Sem valor ainda</p>
      ) : (
        <p className="text-number font-semibold break-words">{props.value}</p>
      )}
      <p className="text-body text-fg">{meaning}</p>
      {props.status === "simulated" && (
        <p className="text-body text-warn">Estimado: {props.reason}</p>
      )}
    </section>
  );
}
