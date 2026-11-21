"use client";

import { useActionState } from "react";
import { sendCode } from "../actions.ts";
import { IDLE } from "../types.ts";
import { buttonClass, inputClass, Message } from "./ui.tsx";

export function EmailForm() {
  const [result, action, pending] = useActionState(sendCode, IDLE);
  const typed = result.status === "error" ? result.fields : undefined;

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span>Seu e-mail</span>
        <input
          key={typed?.email ?? ""}
          defaultValue={typed?.email}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          required
          placeholder="nome@restaurante.com.br"
          className={inputClass}
        />
      </label>
      <Message result={result} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Mandando…" : "Mandar código"}
      </button>
    </form>
  );
}
