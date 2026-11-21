// Reads for the core module. Server only: every query runs with the user's
// session and is filtered again by RLS.
import { createClient } from "@/lib/supabase/server";
import { isMemberRole } from "./rules.ts";
import type { Membership, PendingInvite } from "./types.ts";

type MembershipRow = {
  role: string;
  company: { id: string; name: string } | null;
};

// The current user's own memberships. RLS also returns co-members, so the
// user_id filter matters.
export async function getMyMemberships(userId: string): Promise<Membership[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("role, company:companies(id, name)")
    .eq("user_id", userId)
    .returns<MembershipRow[]>();

  if (error) throw new Error(`memberships query failed: ${error.message}`);

  return (data ?? [])
    .filter((row) => row.company && isMemberRole(row.role))
    .map((row) => ({
      companyId: row.company!.id,
      companyName: row.company!.name,
      role: row.role as Membership["role"],
    }))
    .sort((a, b) => a.companyName.localeCompare(b.companyName, "pt-BR"));
}

export async function getMyMembership(
  userId: string,
  companyId: string,
): Promise<Membership | null> {
  const memberships = await getMyMemberships(userId);
  return memberships.find((m) => m.companyId === companyId) ?? null;
}

// Invites not accepted, not revoked and not expired, newest first.
export async function getPendingInvites(
  companyId: string,
): Promise<PendingInvite[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invites")
    .select("id, email, role, expires_at")
    .eq("company_id", companyId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) throw new Error(`invites query failed: ${error.message}`);

  return (data ?? [])
    .filter((row) => isMemberRole(row.role))
    .map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role as PendingInvite["role"],
      expiresAt: row.expires_at,
    }));
}
