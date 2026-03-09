import type { MetadataRoute } from "next";

const FALLBACK_SITE_URL = "https://www.satfacil.com.mx";

function getBaseUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  if (!configured) return FALLBACK_SITE_URL;

  const withProtocol = /^https?:\/\//i.test(configured)
    ? configured
    : `https://${configured}`;

  try {
    const parsed = new URL(withProtocol);
    return parsed.origin;
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/app/", "/cuenta/", "/chat/", "/login/", "/signup/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
