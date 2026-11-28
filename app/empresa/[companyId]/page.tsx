import Link from "next/link";
import { modulesFor, moduleHref } from "@/lib/modules/access";
import { requireMember } from "@/lib/modules/guard";
import { SignOutButton } from "@/modules/core/components/SignOutButton";
import { buttonClass, Screen, TextLink } from "@/modules/core/components/ui";
import { getMyMemberships } from "@/modules/core/queries";
import { youAre } from "@/modules/core/rules";

// Home per role, built from the module registry. No generic menu.
export default async function CompanyHome({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const { user, membership } = await requireMember(companyId);

  const modules = modulesFor(membership.role);
  const hasOtherCompanies = (await getMyMemberships(user.id)).length > 1;

  return (
    <Screen title={membership.companyName}>
      <p className="text-xl">{youAre(membership.role)}</p>
      {modules.length === 0 ? (
        <p>Por enquanto o app é só do dono e do administrador.</p>
      ) : (
        <nav className="flex flex-col gap-3">
          {modules.map((entry) => (
            <Link
              key={entry.id}
              href={moduleHref(entry, companyId)}
              className={buttonClass}
            >
              {entry.name}
            </Link>
          ))}
        </nav>
      )}
      {hasOtherCompanies && <TextLink href="/">Trocar de empresa</TextLink>}
      <SignOutButton />
    </Screen>
  );
}
