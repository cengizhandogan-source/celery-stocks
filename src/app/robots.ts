import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://coinly.club";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login"],
        disallow: ["/api/", "/auth/", "/messages"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
