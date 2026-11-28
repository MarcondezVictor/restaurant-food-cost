// Visual only: shows a data status in kitchen language. The word carries the
// meaning, the color only helps (never color alone). R5 (#4) wires the data.
import {
  STATUS_LABELS,
  STATUS_TONES,
  type DataStatus,
  type StatusTone,
} from "./rules.ts";

const TONES: Record<StatusTone, string> = {
  ok: "border-ok text-ok",
  neutral: "border-control text-fg",
  warn: "border-warn text-warn",
  danger: "border-danger text-danger",
};

export function StatusBadge({ status }: { status: DataStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 text-caption font-semibold ${TONES[STATUS_TONES[status]]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
