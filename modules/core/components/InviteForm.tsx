"use client";

import { useActionState } from "react";
import { createInvite } from "../actions.ts";
import { IDLE, ROLE_LABELS, type MemberRole } from "../types.ts";
import { buttonClass, inputClass, Message } from "./ui.tsx";

export function InviteForm({
  companyId,
  roles,
}: {
  companyId: string;
  roles: MemberRole[];
}) {
  const [result, action, pending] = useActionState(createInvite, IDLE);
  const typed = result.status === "error" ? result.fields : undefined;
  const typedRole = roles.find((role) => role === typed?.role);
  const defaultRole: MemberRole =
    typedRole ?? (roles.includes("chef") ? "chef" : roles[0]);
  // A new key after each result remounts the inputs with these defaults.
  const formKey = JSON.stringify(result);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="companyId" value={companyId} />
      <label className="flex flex-col gap-2">
        <span>E-mail da pessoa</span>
        <input
          key={`email-${formKey}`}
          defaultValue={typed?.email}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="off"
          autoCapitalize="none"
          required
          placeholder="nome@restaurante.com.br"
          className={inputClass}
        />
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2">Papel na equipe</legend>
        <div className="grid grid-cols-2 gap-2">
          {roles.map((role) => (
            <label
              key={`${role}-${formKey}`}
              className="flex min-h-tap items-center gap-2 rounded-control border border-border px-3 has-[:checked]:border-accent"
            >
              <input
                type="radio"
                name="role"
                value={role}
                defaultChecked={role === defaultRole}
                className="size-5 accent-accent"
              />
              <span>{ROLE_LABELS[role]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Message result={result} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Salvando…" : "Criar convite"}
      </button>
    </form>
  );
}
