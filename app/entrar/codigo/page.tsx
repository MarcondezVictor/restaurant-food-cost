import { redirect } from "next/navigation";
import { getCurrentUser, SIGN_IN_PATH } from "@/lib/auth";
import { CodeForm } from "@/modules/core/components/CodeForm";
import { Screen, TextLink } from "@/modules/core/components/ui";
import { checkEmail } from "@/modules/core/rules";

export default async function CodePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[] }>;
}) {
  if (await getCurrentUser()) redirect("/");

  const { email: raw } = await searchParams;
  const email = checkEmail(Array.isArray(raw) ? raw[0] : raw);
  if (!email.ok) redirect(SIGN_IN_PATH);

  return (
    <Screen title="Digite o código">
      <p className="text-muted">
        Mandamos um código para <span className="text-fg">{email.value}</span>.
        Ele vale por 10 minutos.
      </p>
      <CodeForm email={email.value} />
      <TextLink href={SIGN_IN_PATH}>Usar outro e-mail</TextLink>
    </Screen>
  );
}
