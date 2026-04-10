import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Celery Stocks — Professional Financial Terminal",
    short_name: "Celery Stocks",
    description:
      "Real-time stock and crypto quotes, portfolio tracking, financial analysis, and AI-powered insights.",
    start_url: "/",
    display: "standalone",
    background_color: "#1C1C1C",
    theme_color: "#1C1C1C",
    icons: [
      {
        src: "/icon.png",
        sizes: "1563x1563",
        type: "image/png",
      },
    ],
  };
}
