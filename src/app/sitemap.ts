import type { MetadataRoute } from "next";

import { listSatCfdiErrorCodes } from "@/lib/sat/error-library";

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

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/precios`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/validar-xml`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/lote-xml`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contacto`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/ayuda`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/guias`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/integraciones`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/errores-cfdi`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/errores-sat`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];

  const errorRoutes: MetadataRoute.Sitemap = listSatCfdiErrorCodes().map(
    (code) => {
      return {
        url: `${baseUrl}/errores-sat/${code.toLowerCase()}`,
        changeFrequency: "weekly",
        priority: 0.7,
      };
    },
  );

  const legacyErrorRoutes: MetadataRoute.Sitemap = Array.from(
    { length: 20 },
    (_, index) => {
      const code = 401 + index;
      return {
        url: `${baseUrl}/errores/cfdi${code}`,
        changeFrequency: "weekly",
        priority: 0.6,
      };
    },
  );

  return [...staticRoutes, ...errorRoutes, ...legacyErrorRoutes];
}
