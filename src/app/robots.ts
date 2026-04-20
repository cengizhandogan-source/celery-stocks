import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://coinly.club";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/social", "/login"],
        disallow: ["/api/", "/auth/", "/social/messages"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
