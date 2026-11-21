// Public Supabase settings. Read with direct `process.env.NEXT_PUBLIC_*`
// access so Next.js can inline them in the browser bundle.
// The secret key (SUPABASE_SECRET_KEY) is not read anywhere in R2.
export function supabaseEnv(): { url: string; publishableKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. " +
        "Copy .env.example to .env.local and fill it from `npx supabase status`.",
    );
  }

  return { url, publishableKey };
}
