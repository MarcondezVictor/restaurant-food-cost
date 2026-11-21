import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";

// Supabase client for Server Components, Server Actions and Route Handlers.
// Create one per request; never share it between requests.
export async function createClient() {
  // cookies() first: it marks the route as request-time, so `next build`
  // never prerenders it and the build does not need the Supabase env.
  const cookieStore = await cookies();
  const { url, publishableKey } = supabaseEnv();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot set cookies. proxy.ts refreshes the
          // session on every request, so this write is not needed there.
        }
      },
    },
  });
}
