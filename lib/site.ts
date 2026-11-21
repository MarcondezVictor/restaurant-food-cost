// Public address of this installation, used to build links people receive
// (the sign-in link in an invite). Never derived from request headers.
export function siteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL;

  if (!url) {
    throw new Error(
      "Missing NEXT_PUBLIC_SITE_URL. Copy .env.example to .env.local; locally it is http://localhost:3000.",
    );
  }

  return url.replace(/\/+$/, "");
}
