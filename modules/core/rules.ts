// Pure rules for the core module. No I/O; unit tested in tests/core-rules.test.mjs.
import { MEMBER_ROLES, ROLE_LABELS, type MemberRole } from "./types.ts";

type Check<T> = { ok: true; value: T } | { ok: false; message: string };

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function checkEmail(raw: unknown): Check<string> {
  if (typeof raw !== "string" || raw.trim() === "") {
    return {
      ok: false,
      message: "Digite o e-mail, por exemplo nome@restaurante.com.br.",
    };
  }
  const email = normalizeEmail(raw);
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return {
      ok: false,
      message:
        "Esse e-mail parece incompleto. Confira se tem @ e o final, como nome@restaurante.com.br.",
    };
  }
  return { ok: true, value: email };
}

export function checkCode(raw: unknown): Check<string> {
  const code = typeof raw === "string" ? raw.replace(/\s/g, "") : "";
  if (!/^\d{6}$/.test(code)) {
    return {
      ok: false,
      message: "O código tem 6 números. Confira o e-mail e digite de novo.",
    };
  }
  return { ok: true, value: code };
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(raw: unknown): raw is string {
  return typeof raw === "string" && UUID_PATTERN.test(raw);
}

export function isMemberRole(raw: unknown): raw is MemberRole {
  return (
    typeof raw === "string" && (MEMBER_ROLES as readonly string[]).includes(raw)
  );
}

// Roles a member can hand out. Only an owner invites an owner; manager and
// chef do not invite. Mirrors the invites insert policy.
export function rolesInviterCanGrant(inviter: MemberRole): MemberRole[] {
  if (inviter === "owner") return ["owner", "admin", "manager", "chef"];
  if (inviter === "admin") return ["admin", "manager", "chef"];
  return [];
}

export function canInvite(role: MemberRole): boolean {
  return rolesInviterCanGrant(role).length > 0;
}

export function youAre(role: MemberRole): string {
  return `você é ${ROLE_LABELS[role]}`;
}

export function alreadyMemberMessage(role: MemberRole): string {
  return `Esse e-mail já faz parte da equipe como ${ROLE_LABELS[role]}. O convite não muda o papel.`;
}

export const PENDING_INVITE_MESSAGE =
  "Já existe um convite pendente para esse e-mail. Revogue o antigo na lista abaixo para mandar outro.";

// Turns a database error from the invite insert into a message that says what
// to do. `code` and `message` come from PostgREST; `details` carries the
// current role when the e-mail is already a member.
export function inviteErrorMessage(error: {
  code?: string;
  message?: string;
  details?: string | null;
}): string {
  if (error.code === "23505") {
    if (error.message?.includes("already a member")) {
      return isMemberRole(error.details)
        ? alreadyMemberMessage(error.details)
        : "Esse e-mail já faz parte da equipe. O convite não muda o papel.";
    }
    return PENDING_INVITE_MESSAGE;
  }
  if (error.code === "42501") {
    return "Você não pode mandar esse convite. Só o dono convida outro dono; gerente e chef não convidam.";
  }
  return "Não deu para salvar o convite agora. Confira a internet e tente de novo.";
}

// "28/11 às 14:05", in São Paulo time.
export function formatDateTime(iso: string): string {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("day")}/${get("month")} às ${get("hour")}:${get("minute")}`;
}

export function inviteShareText(params: {
  companyName: string;
  email: string;
  signInUrl: string;
}): string {
  return (
    `Você foi convidado para a equipe do ${params.companyName} no app de custo da comida. ` +
    `Entre com o e-mail ${params.email} neste link: ${params.signInUrl}`
  );
}
