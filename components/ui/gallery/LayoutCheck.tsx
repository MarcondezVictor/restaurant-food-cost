"use client";

// Measures the gallery in the browser and says, in words, whether the rules
// of AGENTS.md section 9.6 hold on this page: no sideways scroll, everything
// you tap at least 44 px tall, body text at least 16 px (captions excepted).
// Runs again when the window or the root font size changes.
import { useEffect, useState } from "react";

type Report = {
  pageWidth: number;
  windowWidth: number;
  smallTargets: string[];
  smallTexts: string[];
};

const TARGETS =
  "button, a[href], input:not([type=hidden]):not(.sr-only), summary, label:has(> input[type=radio])";

function describe(element: Element): string {
  const text = (element.textContent ?? "").trim().slice(0, 30);
  return `${element.tagName.toLowerCase()} "${text}"`;
}

function measure(): Report {
  const root = document.documentElement;
  const rootPx = parseFloat(getComputedStyle(root).fontSize);
  const scale = rootPx / 16;
  const main = document.querySelector("main") ?? document.body;

  const smallTargets: string[] = [];
  main.querySelectorAll(TARGETS).forEach((element) => {
    const box = element.getBoundingClientRect();
    if (box.width === 0 && box.height === 0) return; // not shown
    if (box.height + 0.5 < 44 * scale) {
      smallTargets.push(`${describe(element)}: ${Math.round(box.height)} px`);
    }
  });

  const smallTexts: string[] = [];
  main.querySelectorAll("*").forEach((element) => {
    const ownText = Array.from(element.childNodes).some(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
    );
    if (!ownText || element.closest(".text-caption")) return;
    const box = element.getBoundingClientRect();
    if (box.width === 0 && box.height === 0) return;
    const px = parseFloat(getComputedStyle(element).fontSize);
    if (px + 0.1 < 16 * scale) {
      smallTexts.push(`${describe(element)}: ${px} px`);
    }
  });

  return {
    pageWidth: root.scrollWidth,
    windowWidth: root.clientWidth,
    smallTargets,
    smallTexts,
  };
}

export function LayoutCheck() {
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    const run = () => setReport(measure());
    const first = setTimeout(run, 300);
    window.addEventListener("resize", run);
    const observer = new MutationObserver(() => setTimeout(run, 50));
    observer.observe(document.documentElement, { attributes: true });
    return () => {
      clearTimeout(first);
      window.removeEventListener("resize", run);
      observer.disconnect();
    };
  }, []);

  if (!report) {
    return <p className="text-body text-muted">Conferindo a página…</p>;
  }

  const scrolls = report.pageWidth > report.windowWidth;
  const ok =
    !scrolls &&
    report.smallTargets.length === 0 &&
    report.smallTexts.length === 0;

  return (
    <section
      id="layout-check"
      data-ok={ok}
      className={`flex flex-col gap-2 rounded-card border bg-surface p-4 ${
        ok ? "border-ok" : "border-danger"
      }`}
    >
      <p
        className={`text-body font-semibold ${ok ? "text-ok" : "text-danger"}`}
      >
        {ok
          ? "Conferência da página: tudo certo"
          : "Conferência da página: corrigir"}
      </p>
      <p className="text-body">
        Largura {report.windowWidth} px:{" "}
        {scrolls
          ? `rola para o lado (${report.pageWidth} px).`
          : "sem rolagem para o lado."}
      </p>
      <p className="text-body">
        Toques menores que 44 px: {report.smallTargets.length}
      </p>
      {report.smallTargets.map((line) => (
        <p key={line} className="text-body text-danger break-all">
          {line}
        </p>
      ))}
      <p className="text-body">
        Textos menores que 16 px fora das legendas: {report.smallTexts.length}
      </p>
      {report.smallTexts.map((line) => (
        <p key={line} className="text-body text-danger break-all">
          {line}
        </p>
      ))}
    </section>
  );
}
