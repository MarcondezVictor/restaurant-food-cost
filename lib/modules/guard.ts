import "server-only";

// Module guard: who may open which company screen and run which action.
// The decision is the pure decideAccess() in access.ts; this file adds the
// session and the membership. RLS stays the final word on every read and write.
import { notFound } from "next/navigation";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { getMyMembership } from "@/modules/core/queries";
import { isUuid } from "@/modules/core/rules";
import type { ActionResult, Membership } from "@/modules/core/types";
import { ACCESS_MESSAGES, decideAccess, type ModuleId } from "./access.ts";

export type Allowed = { user: CurrentUser; membership: Membership };
type Refusal = Extract<ActionResult, { status: "error" }>;

// The caller's membership in the company, or null. A malformed id is treated
// like a company the user does not belong to.
async function loadMembership(
  companyId: string,
): Promise<{ user: CurrentUser; membership: Membership | null }> {
  const user = await requireUser();
  if (!isUuid(companyId)) return { user, membership: null };
  return { user, membership: await getMyMembership(user.id, companyId) };
}

// Company home: every member may open it. A non-member, or a company that
// does not exist, gets the same not-member page (notFound, HTTP 404).
export async function requireMember(companyId: string): Promise<Allowed> {
  const { user, membership } = await loadMembership(companyId);
  if (!membership) notFound();
  return { user, membership };
}

// Module page. Not a member: the not-member page (notFound). Wrong role:
// `allowed` is false and the page renders <WrongRolePage />.
export async function requireModule(
  moduleId: ModuleId,
  companyId: string,
): Promise<({ allowed: true } & Allowed) | { allowed: false }> {
  const { user, membership } = await loadMembership(companyId);
  const decision = decideAccess(membership?.role ?? null, moduleId);
  if (!membership || decision === "not-member") notFound();
  if (decision === "wrong-role") return { allowed: false };
  return { allowed: true, user, membership };
}

// Server action. An action cannot render a page, so a refusal comes back as
// the same Portuguese message the pages show.
export async function checkModule(
  moduleId: ModuleId,
  companyId: string,
): Promise<({ ok: true } & Allowed) | { ok: false; result: Refusal }> {
  const { user, membership } = await loadMembership(companyId);
  const decision = decideAccess(membership?.role ?? null, moduleId);
  if (!membership || decision !== "allow") {
    const reason = decision === "wrong-role" ? "wrong-role" : "not-member";
    return {
      ok: false,
      result: { status: "error", message: ACCESS_MESSAGES[reason] },
    };
  }
  return { ok: true, user, membership };
}
