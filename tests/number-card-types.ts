// Type test, checked by `npm run typecheck` (tsc), not run by node --test.
// Each @ts-expect-error line must fail to compile; if NumberCardProps ever
// accepts it, tsc reports the directive as unused and verify fails.
import type { NumberCardProps } from "@/components/ui/NumberCard";

const b = { label: "Custo da comida", meaning: "De cada R$ 100, R$ 28." };

export const accepted: NumberCardProps[] = [
  { ...b, status: "real", value: "28%" },
  { ...b, status: "informed", value: "28%" },
  { ...b, status: "simulated", value: "28%", reason: "faltam 2 notas." },
  { ...b, status: "missing", value: null },
];

// "missing" must have no value.
// @ts-expect-error missing with a value
export const r1: NumberCardProps = { ...b, status: "missing", value: "1" };

// Only "missing" may have no value.
// @ts-expect-error real without a value
export const r2: NumberCardProps = { ...b, status: "real", value: null };
// @ts-expect-error informed without a value
export const r3: NumberCardProps = { ...b, status: "informed", value: null };
// @ts-expect-error simulated without a value
export const r4: NumberCardProps = { ...b, status: "simulated", value: null };

// An estimated number must say why; only an estimated number has a reason.
// @ts-expect-error simulated without a reason
export const r5: NumberCardProps = { ...b, status: "simulated", value: "1" };
// @ts-expect-error real with a reason
export const r6: NumberCardProps = {
  ...b,
  status: "real",
  value: "1",
  reason: "x",
};
