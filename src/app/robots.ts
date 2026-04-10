import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://celery-stocks.cengizhan-dogan.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/login", "/signup"],
        disallow: ["/api/", "/auth/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
