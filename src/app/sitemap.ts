import type { MetadataRoute } from "next";

const FALLBACK_SITE_URL = "http://localhost:3000";

function getBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const base = configured && configured.length > 0 ? configured : FALLBACK_SITE_URL;
  return base.endsWith("/") ? base.slice(0, -1) : base;
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
      url: `${baseUrl}/pricing`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/cfdi-xml-validator`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/cfdi-batch-validator`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/validate-cfdi`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/errores`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  const errorRoutes: MetadataRoute.Sitemap = Array.from({ length: 20 }, (_, index) => {
    const code = 401 + index;
    return {
      url: `${baseUrl}/errores/cfdi${code}`,
      changeFrequency: "weekly",
      priority: 0.7,
    };
  });

  return [...staticRoutes, ...errorRoutes];
}
