"use server";

// Server actions of the core module, in the AGENTS.md section 8 order:
// validate input, check session and role, write and confirm, revalidate,
// return a message in Portuguese.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, SIGN_IN_PATH } from "@/lib/auth";
import { checkModule } from "@/lib/modules/guard";
import { createClient } from "@/lib/supabase/server";
import {
  alreadyMemberMessage,
  checkCode,
  checkEmail,
  inviteErrorMessage,
  isMemberRole,
  isUuid,
  rolesInviterCanGrant,
} from "./rules.ts";
import { ROLE_LABELS, type ActionResult } from "./types.ts";

const CODE_PATH = "/entrar/codigo";

// ---------------------------------------------------------------------------
// Sign-in (no session yet, so no role check)
// ---------------------------------------------------------------------------

export async function sendCode(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const typedEmail = String(formData.get("email") ?? "");
  const fields = { email: typedEmail };
  const email = checkEmail(typedEmail);
  if (!email.ok) return { status: "error", message: email.message, fields };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.value,
    options: { shouldCreateUser: true },
  });

  if (error) {
    if (error.status === 429) {
      return {
        status: "error",
        message:
          "Você pediu códigos demais em pouco tempo. Espere 1 minuto e peça de novo.",
        fields,
      };
    }
    return {
      status: "error",
      message:
        "Não deu para mandar o código agora. Confira a internet e tente de novo.",
      fields,
    };
  }

  redirect(`${CODE_PATH}?email=${encodeURIComponent(email.value)}`);
}

export async function verifyCode(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const email = checkEmail(formData.get("email"));
  if (!email.ok) return { status: "error", message: email.message };
  const code = checkCode(formData.get("code"));
  if (!code.ok) return { status: "error", message: code.message };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email: email.value,
    token: code.value,
    type: "email",
  });

  if (error) {
    return {
      status: "error",
      message:
        "Código errado ou vencido. Use o código do último e-mail ou toque em “Mandar outro código”.",
    };
  }

  // Pending invites for this e-mail become memberships. If this fails, the
  // home tries again; the user still gets in.
  await acceptPendingInvites();

  redirect("/");
}

// Turns the signed-in user's pending invites into memberships. Returns how
// many were accepted (0 on failure: the caller just shows what exists).
export async function acceptPendingInvites(): Promise<number> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_my_invites");
  if (error || typeof data !== "number") return 0;
  return data;
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(SIGN_IN_PATH);
}

// ---------------------------------------------------------------------------
// Invites
// ---------------------------------------------------------------------------

export async function createInvite(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const companyId = formData.get("companyId");
  const role = formData.get("role");
  const typedEmail = String(formData.get("email") ?? "");
  const fields = { email: typedEmail, role: String(role ?? "") };
  const fail = (message: string): ActionResult => ({
    status: "error",
    message,
    fields,
  });
  const email = checkEmail(typedEmail);
  if (!isUuid(companyId)) {
    return fail(
      "Empresa não encontrada. Volte à tela inicial e tente de novo.",
    );
  }
  if (!email.ok) return fail(email.message);
  if (!isMemberRole(role)) {
    return fail("Escolha o papel da pessoa na lista.");
  }

  const access = await checkModule("core.invites", companyId);
  if (!access.ok) return fail(access.result.message);

  // Who may grant which role stays a core rule (only an owner invites an owner).
  if (!rolesInviterCanGrant(access.membership.role).includes(role)) {
    return fail("Só o dono convida outro dono. Escolha outro papel.");
  }

  const supabase = await createClient();

  // Ask first only to word the message; the database refuses it anyway.
  const { data: currentRole } = await supabase.rpc("member_role_for_email", {
    company_id: companyId,
    email: email.value,
  });
  if (isMemberRole(currentRole)) {
    return fail(alreadyMemberMessage(currentRole));
  }

  const { data, error } = await supabase
    .from("invites")
    .insert({ company_id: companyId, email: email.value, role })
    .select("id");

  if (error) return fail(inviteErrorMessage(error));
  if (!data || data.length !== 1) {
    return fail(
      "O convite não foi salvo. Atualize a tela e confira a lista antes de tentar de novo.",
    );
  }

  revalidatePath(`/empresa/${companyId}/convites`);
  return {
    status: "ok",
    message: `Convite criado: ${email.value} como ${ROLE_LABELS[role]}. Agora mande o link de entrada para essa pessoa.`,
  };
}

export async function revokeInvite(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const companyId = formData.get("companyId");
  const inviteId = formData.get("inviteId");
  if (!isUuid(companyId) || !isUuid(inviteId)) {
    return {
      status: "error",
      message: "Convite não encontrado. Atualize a tela e tente de novo.",
    };
  }

  const access = await checkModule("core.invites", companyId);
  if (!access.ok) return access.result;

  // RLS still decides the rest: only an owner revokes an owner invite.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", inviteId)
    .eq("company_id", companyId)
    .select("id");

  if (error) {
    return {
      status: "error",
      message:
        "Não deu para revogar agora. Confira a internet e tente de novo.",
    };
  }
  if (!data || data.length !== 1) {
    return {
      status: "error",
      message:
        "Esse convite não pode mais ser revogado: já foi aceito, já foi revogado, ou é de dono e só o dono revoga.",
    };
  }

  revalidatePath(`/empresa/${companyId}/convites`);
  return {
    status: "ok",
    message: "Convite revogado. A pessoa não entra mais com ele.",
  };
}
