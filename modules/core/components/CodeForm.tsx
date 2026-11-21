"use client";

import { useActionState } from "react";
import { sendCode, verifyCode } from "../actions.ts";
import { IDLE } from "../types.ts";
import {
  buttonClass,
  inputClass,
  Message,
  secondaryButtonClass,
} from "./ui.tsx";

export function CodeForm({ email }: { email: string }) {
  const [result, action, pending] = useActionState(verifyCode, IDLE);
  const [resendResult, resend, resending] = useActionState(sendCode, IDLE);

  return (
    <div className="flex flex-col gap-6">
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="email" value={email} />
        <label className="flex flex-col gap-2">
          <span>Código de 6 números</span>
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]*"
            maxLength={7}
            required
            autoFocus
            placeholder="123456"
            className={`${inputClass} text-center text-2xl tracking-[0.4em]`}
          />
        </label>
        <Message result={result} />
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Conferindo…" : "Entrar"}
        </button>
      </form>

      <form action={resend} className="flex flex-col gap-2">
        <input type="hidden" name="email" value={email} />
        <Message result={resendResult} />
        <button
          type="submit"
          disabled={resending}
          className={secondaryButtonClass}
        >
          {resending ? "Mandando…" : "Mandar outro código"}
        </button>
      </form>
    </div>
  );
}
