import { SIGN_IN_PATH } from "@/lib/auth";
import { WrongRolePage } from "@/lib/modules/AccessPages";
import { requireModule } from "@/lib/modules/guard";
import { siteUrl } from "@/lib/site";
import { InviteForm } from "@/modules/core/components/InviteForm";
import { PendingInvites } from "@/modules/core/components/PendingInvites";
import { Screen, TextLink } from "@/modules/core/components/ui";
import { getPendingInvites } from "@/modules/core/queries";
import { inviteShareText, rolesInviterCanGrant } from "@/modules/core/rules";

export default async function InvitesPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const access = await requireModule("core.invites", companyId);
  if (!access.allowed) return <WrongRolePage companyId={companyId} />;
  const { membership } = access;

  // Who may grant which role stays a core rule (only an owner invites an owner).
  const roles = rolesInviterCanGrant(membership.role);

  const invites = await getPendingInvites(companyId);
  const signInUrl = `${siteUrl()}${SIGN_IN_PATH}`;

  return (
    <Screen title="Convidar pessoa">
      <p className="text-muted">
        O app não manda e-mail de convite. Depois de criar, mande o link de
        entrada para a pessoa, de preferência pelo WhatsApp:{" "}
        <span className="break-all text-fg">{signInUrl}</span>
      </p>
      <InviteForm companyId={companyId} roles={roles} />

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Convites pendentes</h2>
        <PendingInvites
          companyId={companyId}
          invites={invites.map((invite) => ({
            ...invite,
            shareHref: `https://wa.me/?text=${encodeURIComponent(
              inviteShareText({
                companyName: membership.companyName,
                email: invite.email,
                signInUrl,
              }),
            )}`,
          }))}
        />
      </section>
      <TextLink href={`/empresa/${companyId}`}>Voltar</TextLink>
    </Screen>
  );
}
