import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { SignOutButton } from "@/modules/core/components/SignOutButton";
import { buttonClass, Screen, TextLink } from "@/modules/core/components/ui";
import { getMyMemberships } from "@/modules/core/queries";
import { canInvite, isUuid, youAre } from "@/modules/core/rules";
import Link from "next/link";

export default async function CompanyHome({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  if (!isUuid(companyId)) notFound();

  const user = await requireUser();
  const memberships = await getMyMemberships(user.id);
  const membership = memberships.find((m) => m.companyId === companyId);
  if (!membership) notFound();

  return (
    <Screen title={membership.companyName}>
      <p className="text-xl">{youAre(membership.role)}</p>
      <p className="text-muted">
        Esta é a sua tela inicial. Custos, notas e fichas aparecem aqui nas
        próximas etapas.
      </p>
      {canInvite(membership.role) && (
        <Link href={`/empresa/${companyId}/convites`} className={buttonClass}>
          Convidar pessoa
        </Link>
      )}
      {memberships.length > 1 && (
        <TextLink href="/">Trocar de empresa</TextLink>
      )}
      <SignOutButton />
    </Screen>
  );
}
