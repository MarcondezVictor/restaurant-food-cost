import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { EmailForm } from "@/modules/core/components/EmailForm";
import { Screen } from "@/modules/core/components/ui";

export default async function SignInPage() {
  if (await getCurrentUser()) redirect("/");

  return (
    <Screen title="Entrar">
      <p className="text-muted">
        Digite seu e-mail. Vamos mandar um código de 6 números, sem senha.
      </p>
      <EmailForm />
    </Screen>
  );
}
