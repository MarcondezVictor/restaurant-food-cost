import assert from "node:assert/strict";
import test from "node:test";
import {
  closesByItself,
  createSubmitGate,
  createTapGate,
  devUiVisible,
  DATA_STATUSES,
  dismissToast,
  formatQuantity,
  fractionOf,
  parseQuantity,
  quantityInputText,
  showToast,
  singleFlight,
  STATUS_LABELS,
  STATUS_TONES,
  stepValue,
  SUBMIT_START_MS,
  withFraction,
} from "../components/ui/rules.ts";

// --- one tap, one request ---------------------------------------------------

function deferred() {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
}

test("a double tap while loading sends one request", async () => {
  let requests = 0;
  const reply = deferred();
  const tap = singleFlight(() => {
    requests += 1;
    return reply.promise;
  });

  const first = tap();
  const second = tap(); // second tap while the first is still sending
  assert.equal(requests, 1);
  assert.equal(await second, false);

  reply.resolve();
  assert.equal(await first, true);

  // After the answer, the next tap sends again.
  await tap();
  assert.equal(requests, 2);
});

test("a failed request opens the button again", async () => {
  let requests = 0;
  const tap = singleFlight(async () => {
    requests += 1;
    throw new Error("rede caiu");
  });
  await assert.rejects(tap());
  await assert.rejects(tap());
  assert.equal(requests, 2);
});

test("the tap gate lets one tap through until it is released", () => {
  const gate = createTapGate();
  assert.equal(gate.enter(), true);
  assert.equal(gate.enter(), false);
  assert.equal(gate.isOpen(), false);
  gate.release();
  assert.equal(gate.isOpen(), true);
  assert.equal(gate.enter(), true);
});

test("submit: a double tap while the form sends goes through once", () => {
  const gate = createSubmitGate();
  assert.equal(gate.tap(), true);
  gate.sendingStarted();
  assert.equal(gate.tap(), false); // second tap while sending
  gate.startWindowEnded(); // the check after the tap changes nothing
  assert.equal(gate.isOpen(), false);
  gate.sendingEnded();
  assert.equal(gate.tap(), true);
});

test("submit: the gate opens again when sending never starts", () => {
  // A form without a server action, or an onSubmit with preventDefault.
  const gate = createSubmitGate();
  assert.equal(gate.tap(), true);
  assert.equal(gate.tap(), false);
  gate.startWindowEnded();
  assert.equal(gate.isOpen(), true);
  assert.equal(gate.tap(), true);
});

test("submit: the start window is short (a second, not a minute)", () => {
  assert.ok(SUBMIT_START_MS > 0 && SUBMIT_START_MS <= 2000);
});

// --- stepper ----------------------------------------------------------------

test("parseQuantity reads what the person typed", () => {
  const previous = 3;
  assert.equal(parseQuantity("2,5", previous), 2.5);
  assert.equal(parseQuantity("2.5", previous), 2.5);
  assert.equal(parseQuantity(" 48 ", previous), 48);
  assert.equal(parseQuantity(",5", previous), 0.5);
  assert.equal(parseQuantity("", previous), previous);
  assert.equal(parseQuantity("   ", previous), previous);
  assert.equal(parseQuantity("abc", previous), previous);
  assert.equal(parseQuantity("2,5kg", previous), previous);
  assert.equal(parseQuantity("1,2,3", previous), previous);
  assert.equal(parseQuantity("-4", previous), 0); // negative → min
  assert.equal(parseQuantity("-4", previous, 1), 1);
  assert.equal(parseQuantity("99", previous, 0, 50), 50); // above max → max
});

test("the input shows the value with a comma", () => {
  assert.equal(quantityInputText(2.5), "2,5");
  assert.equal(quantityInputText(48), "48");
});

test("stepValue stays between min and max", () => {
  assert.equal(stepValue(0, -1), 0);
  assert.equal(stepValue(2, 1), 3);
  assert.equal(stepValue(5, 1, 0, 5), 5);
  assert.equal(stepValue(0.1, 0.2, 0), 0.3);
});

test("fractions are quarters; other decimals keep their value", () => {
  assert.equal(fractionOf(2), 0);
  assert.equal(fractionOf(2.5), 0.5);
  assert.equal(fractionOf(0.75), 0.75);
  assert.equal(fractionOf(2.3), null);
  assert.equal(withFraction(2.5, 0.25), 2.25);
  assert.equal(withFraction(3, 0.75), 3.75);
  assert.equal(withFraction(2.3, 0), 2);
});

test("quantities read like the kitchen says them", () => {
  assert.equal(formatQuantity(0), "0");
  assert.equal(formatQuantity(3), "3");
  assert.equal(formatQuantity(0.5), "½");
  assert.equal(formatQuantity(2.25), "2 ¼");
  assert.equal(formatQuantity(1.75), "1 ¾");
  assert.equal(formatQuantity(2.3), "2,3");
});

// --- toast ------------------------------------------------------------------

test("a new toast replaces the old one", () => {
  const first = { id: 1, message: "Convite enviado.", tone: "ok" };
  const second = { id: 2, message: "Convite cancelado.", tone: "ok" };
  assert.equal(showToast(null, first), first);
  assert.equal(showToast(first, second), second);
});

test("only success toasts close by themselves", () => {
  assert.equal(closesByItself("ok"), true);
  assert.equal(closesByItself("danger"), false);
});

test("the timer of an old toast never closes the new one", () => {
  const second = { id: 2, message: "Convite cancelado.", tone: "ok" };
  assert.equal(dismissToast(second, 1), second);
  assert.equal(dismissToast(second, 2), null);
  assert.equal(dismissToast(null, 2), null);
});

// --- status -----------------------------------------------------------------

test("every data status has a Portuguese label and a tone", () => {
  assert.deepEqual(
    Object.keys(STATUS_LABELS).sort(),
    [...DATA_STATUSES].sort(),
  );
  assert.deepEqual(Object.keys(STATUS_TONES).sort(), [...DATA_STATUSES].sort());
  assert.equal(STATUS_LABELS.simulated, "estimado");
  assert.equal(STATUS_LABELS.informed, "informado");
  assert.equal(STATUS_LABELS.missing, "falta");
  assert.equal(STATUS_TONES.simulated, "warn");
  assert.equal(STATUS_TONES.missing, "danger");
});

// --- /dev/ui ----------------------------------------------------------------

test("/dev/ui shows in development and hides in production", () => {
  assert.equal(devUiVisible("development", undefined), true);
  assert.equal(devUiVisible("test", undefined), true);
  assert.equal(devUiVisible("production", undefined), false);
  assert.equal(devUiVisible("production", ""), false);
  assert.equal(devUiVisible("production", "0"), false);
  assert.equal(devUiVisible("production", "true"), false);
  assert.equal(devUiVisible("production", "1"), true); // the demo only
});
