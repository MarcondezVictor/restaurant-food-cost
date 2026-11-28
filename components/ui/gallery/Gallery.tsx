// The /dev/ui gallery: every component in every state, with synthetic
// Restaurante X content only. Not a screen of the app, so it shows several
// primary buttons on purpose (one per state).
import { ButtonLink } from "../Button.tsx";
import { ChoiceList } from "../ChoiceList.tsx";
import { Field } from "../Field.tsx";
import { InfoHint } from "../InfoHint.tsx";
import { NumberCard } from "../NumberCard.tsx";
import { DATA_STATUSES } from "../rules.ts";
import { StatusBadge } from "../StatusBadge.tsx";
import { Stepper } from "../Stepper.tsx";
import { ToastProvider } from "../Toast.tsx";
import {
  ButtonStates,
  DialogDemo,
  RootFontSize,
  ToastDemo,
} from "./GalleryDemos.tsx";
import { LayoutCheck } from "./LayoutCheck.tsx";

const ROLES = [
  { value: "admin", label: "Administrador" },
  { value: "manager", label: "Gerente" },
  { value: "chef", label: "Chef" },
];

function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-6">
      <h2 className="text-subtitle font-semibold">
        {number}. {title}
      </h2>
      {children}
    </section>
  );
}

function State({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-caption text-muted">{name}</p>
      {children}
    </div>
  );
}

export function Gallery({ textSize }: { textSize?: string }) {
  return (
    <ToastProvider>
      <main className="mx-auto flex w-full max-w-md flex-col gap-8 px-gutter pt-8 pb-40">
        <header className="flex flex-col gap-2">
          <h1 className="text-title font-semibold">Peças da tela</h1>
          <p className="text-body text-muted">
            Todos os componentes, em todos os estados. Dados fictícios do
            Restaurante X.
          </p>
        </header>

        <LayoutCheck />
        <RootFontSize initial={textSize} />

        <Section number={1} title="Botão">
          <ButtonStates />
          <State name="link com cara de botão">
            <ButtonLink href="/dev/ui" variant="secondary">
              Voltar para o início
            </ButtonLink>
          </State>
        </Section>

        <Section number={2} title="Campo">
          <State name="normal">
            <Field label="E-mail" name="email" type="email" />
          </State>
          <State name="com dica">
            <Field
              label="Nome do fornecedor"
              name="supplier"
              hint="Como está escrito na nota."
              defaultValue="Hortifruti Central"
            />
          </State>
          <State name="com erro">
            <Field
              label="E-mail"
              name="email-error"
              type="email"
              defaultValue="cozinha@restaurante-x"
              error="Falta o fim do e-mail. Exemplo: cozinha@restaurante-x.test"
            />
          </State>
          <State name="desabilitado">
            <Field
              label="Empresa"
              name="company"
              defaultValue="Restaurante X"
              disabled
            />
          </State>
        </Section>

        <Section number={3} title="Lista de escolha">
          <State name="nada escolhido">
            <ChoiceList label="Papel" name="role-empty" options={ROLES} />
          </State>
          <State name="com escolha">
            <ChoiceList
              label="Papel"
              name="role-picked"
              options={ROLES}
              defaultValue="manager"
            />
          </State>
          <State name="com erro">
            <ChoiceList
              label="Papel"
              name="role-error"
              options={ROLES}
              error="Escolha um papel para a pessoa."
            />
          </State>
          <State name="desabilitada">
            <ChoiceList
              label="Papel"
              name="role-disabled"
              options={ROLES}
              defaultValue="chef"
              disabled
            />
          </State>
        </Section>

        <Section number={4} title="Contador (+ e −)">
          <State name="simples, começa do valor anterior">
            <Stepper label="Garrafas de azeite" name="oil" defaultValue={6} />
          </State>
          <State name="com unidade e frações (pacote aberto)">
            <Stepper
              label="Caixas de tomate"
              name="tomato"
              unit="caixas"
              defaultValue={2.5}
              fractions
            />
          </State>
          <State name="no máximo">
            <Stepper label="Bandejas" name="trays" defaultValue={4} max={4} />
          </State>
          <State name="desabilitado">
            <Stepper
              label="Sacos de arroz"
              name="rice"
              defaultValue={3}
              disabled
            />
          </State>
        </Section>

        <Section number={5} title="Selo do dado">
          <div className="flex flex-wrap gap-2">
            {DATA_STATUSES.map((status) => (
              <StatusBadge key={status} status={status} />
            ))}
          </div>
        </Section>

        <Section number={6} title="Botão de explicação">
          <div className="flex items-center justify-between gap-3">
            <p className="text-body">Custo da comida</p>
            <InfoHint label="custo da comida">
              Quanto da venda foi gasto em comida e bebida.
            </InfoHint>
          </div>
        </Section>

        <Section number={7} title="Cartão de número">
          <NumberCard
            label="Custo da comida"
            status="real"
            value="28,4%"
            meaning="De cada R$ 100 vendidos, R$ 28,40 foram de comida."
            hint="Estoque do início + compras − estoque do fim, dividido pelas vendas."
          />
          <NumberCard
            label="Vendas do mês"
            status="informed"
            value="R$ 120.000,00"
            meaning="Total digitado pelo dono, sem taxa de serviço."
          />
          <NumberCard
            label="Custo da comida"
            status="simulated"
            value="29,1%"
            meaning="De cada R$ 100 vendidos, R$ 29,10 foram de comida."
            reason="faltam 2 notas da semana."
          />
          <NumberCard
            label="Valor do estoque"
            status="missing"
            value={null}
            meaning="Falta a contagem do estoque para calcular."
          />
        </Section>

        <Section number={8} title="Aviso com desfazer">
          <ToastDemo />
        </Section>

        <Section number={9} title="Confirmação">
          <DialogDemo />
        </Section>
      </main>
    </ToastProvider>
  );
}
