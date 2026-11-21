export const MEMBER_ROLES = ["owner", "admin", "manager", "chef"] as const;

export type MemberRole = (typeof MEMBER_ROLES)[number];

// What the user reads. Kitchen language, lower case to fit "você é dono".
export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "dono",
  admin: "administrador",
  manager: "gerente",
  chef: "chef",
};

export type Membership = {
  companyId: string;
  companyName: string;
  role: MemberRole;
};

export type PendingInvite = {
  id: string;
  email: string;
  role: MemberRole;
  expiresAt: string;
};

// What every server action returns to the screen.
export type ActionResult =
  | { status: "idle" }
  | { status: "ok"; message: string }
  // fields: what the user typed, so the form comes back filled after an error.
  | { status: "error"; message: string; fields?: Record<string, string> };

export const IDLE: ActionResult = { status: "idle" };
