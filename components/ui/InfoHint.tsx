// An "i" button that opens one sentence about a number (AGENTS.md section
// 9.2). Native <details>: opens without JavaScript, so it works on a slow
// connection before the page finishes loading.

export function InfoHint({
  label,
  children,
}: {
  // What the sentence explains, read by screen readers: "custo da comida".
  label: string;
  // One sentence.
  children: React.ReactNode;
}) {
  return (
    <details className="group relative">
      <summary
        aria-label={`O que é ${label}?`}
        className="inline-flex size-tap cursor-pointer list-none items-center justify-center rounded-full border border-control text-body font-semibold text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg group-open:border-fg [&::-webkit-details-marker]:hidden"
      >
        i
      </summary>
      <p className="absolute top-full right-0 z-10 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-card border border-control bg-surface p-3 text-body text-fg">
        {children}
      </p>
    </details>
  );
}
