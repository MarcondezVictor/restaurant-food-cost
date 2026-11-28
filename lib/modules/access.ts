// Module registry and access decision. Pure: no Next.js, no Supabase, only
// relative imports, so `node --test` loads it directly. The server side
// (session, membership, pages) is in guard.ts.
import type { MemberRole } from "../../modules/core/types.ts";

export type ModuleId = "core.invites";

export type ModuleEntry = {
  id: ModuleId;
  // What the user reads on the home button.
  name: string;
  // Path under /empresa/[companyId]/.
  path: string;
  // Roles that may open it. Explicit, no hierarchy.
  roles: readonly MemberRole[];
};

// Only modules that exist. No placeholders for future ones.
export const MODULES: readonly ModuleEntry[] = [
  {
    id: "core.invites",
    name: "Convidar pessoa",
    path: "convites",
    roles: ["owner", "admin"],
  },
];

export type AccessDecision = "allow" | "not-member" | "wrong-role";

export const ACCESS_MESSAGES: Record<
  Exclude<AccessDecision, "allow">,
  string
> = {
  "not-member": "Esse link não é de uma empresa sua. Volte para o início.",
  "wrong-role":
    "Essa tela é do dono e do administrador. Se precisar dela, fale com o dono.",
};

export function findModule(moduleId: string): ModuleEntry | undefined {
  return MODULES.find((entry) => entry.id === moduleId);
}

// `role` is the caller's role in the company, or null when they are not a
// member (or the company does not exist). An unknown module is refused.
export function decideAccess(
  role: MemberRole | null,
  moduleId: string,
): AccessDecision {
  if (role === null) return "not-member";
  const entry = findModule(moduleId);
  if (!entry || !entry.roles.includes(role)) return "wrong-role";
  return "allow";
}

// Modules a role may open, in registry order. Builds the home per role.
export function modulesFor(role: MemberRole): ModuleEntry[] {
  return MODULES.filter((entry) => entry.roles.includes(role));
}

export function moduleHref(entry: ModuleEntry, companyId: string): string {
  return `/empresa/${companyId}/${entry.path}`;
}
