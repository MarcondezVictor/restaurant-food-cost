import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { acceptPendingInvites } from "@/modules/core/actions";
import { SignOutButton } from "@/modules/core/components/SignOutButton";
import { Screen } from "@/modules/core/components/ui";
import { getMyMemberships } from "@/modules/core/queries";
import { youAre } from "@/modules/core/rules";

export default async function Home() {
  const user = await requireUser();
  const memberships = await getMyMemberships(user.id);

  // No company yet: an invite may have been created after sign-in. After
  // accepting, load the page again: Next.js memoizes identical reads within
  // one render, so a second query here would return the old (empty) list.
  if (memberships.length === 0 && (await acceptPendingInvites()) > 0) {
    redirect("/");
  }

  if (memberships.length === 1) {
    redirect(`/empresa/${memberships[0].companyId}`);
  }

  if (memberships.length === 0) {
    return (
      <Screen title="Você ainda não tem acesso">
        <p>Peça um convite ao dono.</p>
        <p className="text-muted">
          Quando o convite existir, atualize esta tela.
          {user.email ? ` O convite precisa ser para ${user.email}.` : ""}
        </p>
        <SignOutButton />
      </Screen>
    );
  }

  return (
    <Screen title="Escolha a empresa">
      <p className="text-muted">Você faz parte de mais de uma equipe.</p>
      <ul className="flex flex-col gap-3">
        {memberships.map((m) => (
          <li key={m.companyId}>
            <Link
              href={`/empresa/${m.companyId}`}
              className="flex min-h-tap flex-col rounded-card border border-border bg-surface p-4"
            >
              <span className="font-semibold">{m.companyName}</span>
              <span className="text-muted">{youAre(m.role)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <SignOutButton />
    </Screen>
  );
}
