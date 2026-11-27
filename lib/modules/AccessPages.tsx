// The two friendly refusal pages of the module guard. They show no data of
// the company: not its name, not who belongs to it.
import Link from "next/link";
import { buttonClass, Screen } from "@/modules/core/components/ui";
import { ACCESS_MESSAGES } from "./access.ts";

export function NotMemberPage() {
  return (
    <Screen title="Empresa não encontrada">
      <p>{ACCESS_MESSAGES["not-member"]}</p>
      <Link href="/" className={buttonClass}>
        Voltar para o início
      </Link>
    </Screen>
  );
}

export function WrongRolePage({ companyId }: { companyId: string }) {
  return (
    <Screen title="Tela sem acesso">
      <p>{ACCESS_MESSAGES["wrong-role"]}</p>
      <Link href={`/empresa/${companyId}`} className={buttonClass}>
        Voltar para o início
      </Link>
    </Screen>
  );
}
