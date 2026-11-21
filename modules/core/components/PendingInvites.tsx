"use client";

import { useActionState } from "react";
import { revokeInvite } from "../actions.ts";
import { formatDateTime } from "../rules.ts";
import { IDLE, ROLE_LABELS, type PendingInvite } from "../types.ts";
import { Message, secondaryButtonClass } from "./ui.tsx";

// The revoke result lives here, above the list, because the revoked item
// leaves the list as soon as the page revalidates.
export function PendingInvites({
  companyId,
  invites,
}: {
  companyId: string;
  invites: (PendingInvite & { shareHref: string })[];
}) {
  const [result, action, pending] = useActionState(revokeInvite, IDLE);

  return (
    <div className="flex flex-col gap-3">
      <Message result={result} />
      {invites.length === 0 ? (
        <p className="text-muted">Nenhum convite esperando resposta.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {invites.map((invite) => (
            <li
              key={invite.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
            >
              <div>
                <p className="font-semibold break-all">{invite.email}</p>
                <p className="text-muted">
                  {ROLE_LABELS[invite.role]} · vale até{" "}
                  {formatDateTime(invite.expiresAt)}
                </p>
              </div>
              <a
                href={invite.shareHref}
                target="_blank"
                rel="noreferrer"
                className={secondaryButtonClass}
              >
                Mandar link pelo WhatsApp
              </a>
              <form action={action}>
                <input type="hidden" name="companyId" value={companyId} />
                <input type="hidden" name="inviteId" value={invite.id} />
                <button
                  type="submit"
                  disabled={pending}
                  className={secondaryButtonClass}
                >
                  Revogar
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
