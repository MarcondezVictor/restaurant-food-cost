import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Gallery } from "@/components/ui/gallery/Gallery";
import { devUiVisible } from "@/components/ui/rules";

// Every design system component in every state. Development only; in a
// production build only when NEXT_PUBLIC_SHOW_DEV_UI=1 (the demo, #23).
// The check runs for the metadata too, so a hidden page leaves no trace.
function guard() {
  if (
    !devUiVisible(process.env.NODE_ENV, process.env.NEXT_PUBLIC_SHOW_DEV_UI)
  ) {
    notFound();
  }
}

export function generateMetadata(): Metadata {
  guard();
  return {
    title: "Peças da tela",
    robots: { index: false, follow: false },
  };
}

export default async function DevUiPage({
  searchParams,
}: {
  searchParams: Promise<{ texto?: string }>;
}) {
  guard();
  const { texto } = await searchParams;
  return <Gallery textSize={texto} />;
}
