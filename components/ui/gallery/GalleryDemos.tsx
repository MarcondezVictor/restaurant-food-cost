"use client";

// The parts of the /dev/ui gallery that need state. Synthetic data only.
import { useEffect, useState } from "react";
import { Button } from "../Button.tsx";
import { Dialog } from "../Dialog.tsx";
import { useToast } from "../Toast.tsx";

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Changes the root font size, so every size in rem follows (the future
// "texto grande" setting). Resets when leaving the page.
const ROOT_SIZES = [
  { value: "100%", label: "Normal" },
  { value: "125%", label: "Grande" },
  { value: "150%", label: "Maior" },
];

// `initial` comes from ?texto=125 or ?texto=150, to open the page already
// scaled (for screenshots).
export function RootFontSize({ initial }: { initial?: string }) {
  const [size, setSize] = useState(
    ROOT_SIZES.find((option) => option.value === `${initial}%`)?.value ??
      "100%",
  );

  useEffect(() => {
    document.documentElement.style.fontSize = size;
  }, [size]);
  useEffect(
    () => () => void (document.documentElement.style.fontSize = ""),
    [],
  );

  return (
    <div className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
      <p className="text-body font-semibold">Tamanho do texto</p>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Tamanho do texto"
      >
        {ROOT_SIZES.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={size === option.value}
            onClick={() => setSize(option.value)}
            className="inline-flex min-h-tap items-center rounded-control border border-control px-4 text-body text-fg aria-pressed:border-fg aria-pressed:bg-fg aria-pressed:font-semibold aria-pressed:text-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="text-caption text-muted">
        Muda a fonte da raiz para {size}; todos os textos e alturas acompanham.
      </p>
    </div>
  );
}

function Counter({ requests }: { requests: number }) {
  return (
    <p className="text-caption text-muted" aria-live="polite">
      Pedidos enviados: {requests}
    </p>
  );
}

export function ButtonStates() {
  const [clicks, setClicks] = useState(0);
  const [submits, setSubmits] = useState(0);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-caption text-muted">principal</p>
      <Button>Salvar contagem</Button>
      <p className="text-caption text-muted">secundário</p>
      <Button variant="secondary">Ver notas</Button>
      <p className="text-caption text-muted">perigo</p>
      <Button variant="danger">Cancelar convite</Button>
      <p className="text-caption text-muted">desabilitado</p>
      <Button disabled>Salvar contagem</Button>
      <p className="text-caption text-muted">carregando</p>
      <Button loading>Salvar contagem</Button>

      <p className="text-caption text-muted">
        toque duas vezes rápido: um pedido por toque (espera 2 s)
      </p>
      <Button
        variant="secondary"
        onClick={async () => {
          setClicks((n) => n + 1);
          await wait(2000);
        }}
      >
        Toque duas vezes
      </Button>
      <Counter requests={clicks} />

      <p className="text-caption text-muted">
        o mesmo, enviando um formulário (espera 2 s)
      </p>
      <form
        action={async () => {
          setSubmits((n) => n + 1);
          await wait(2000);
        }}
        className="flex flex-col gap-2"
      >
        <Button type="submit" variant="secondary" loadingLabel="Enviando…">
          Enviar formulário
        </Button>
      </form>
      <Counter requests={submits} />
    </div>
  );
}

export function ToastDemo() {
  const toast = useToast();
  const [count, setCount] = useState(12);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-body">Ovos contados: {count}</p>
      <Button
        variant="secondary"
        onClick={() => {
          const before = count;
          setCount(0);
          toast({
            message: "Contagem dos ovos zerada.",
            undo: () => setCount(before),
          });
        }}
      >
        Zerar ovos (com desfazer)
      </Button>
      <Button
        variant="secondary"
        onClick={() => toast({ message: "Convite enviado para a cozinha." })}
      >
        Aviso de sucesso (some em 8 s)
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast({
            tone: "danger",
            message:
              "A internet caiu. Confira o sinal e toque em salvar de novo.",
          })
        }
      >
        Aviso de erro (fica até fechar)
      </Button>
      <p className="text-caption text-muted">
        Toque em dois seguidos: só o último aparece.
      </p>
    </div>
  );
}

export function DialogDemo() {
  const toast = useToast();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Cancelar convite
      </Button>
      <Dialog
        open={open}
        title="Cancelar este convite?"
        message="O link deixa de funcionar. Dá para convidar de novo depois."
        confirmLabel="Cancelar convite"
        cancelLabel="Voltar"
        onCancel={() => setOpen(false)}
        onConfirm={async () => {
          await wait(800);
          setOpen(false);
          toast({
            message: "Convite cancelado.",
            undo: () => toast({ message: "Convite de volta." }),
          });
        }}
      />
    </>
  );
}
