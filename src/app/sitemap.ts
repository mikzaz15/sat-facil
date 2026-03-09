import type { MetadataRoute } from "next";

import { listSatCfdiErrorCodes } from "@/lib/sat/error-library";

const BASE_URL = "https://www.satfacil.com.mx";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/precios`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/validador`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/lote-xml`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/contacto`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/ayuda`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/errores-cfdi`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/errores-sat`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  const errorRoutes: MetadataRoute.Sitemap = listSatCfdiErrorCodes().map(
    (code) => {
      return {
        url: `${BASE_URL}/errores-sat/${code.toLowerCase()}`,
        changeFrequency: "weekly",
        priority: 0.7,
      };
    },
  );

  return [...staticRoutes, ...errorRoutes];
}
