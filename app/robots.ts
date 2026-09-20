// app/robots.ts

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://www.jfer.co.in";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
