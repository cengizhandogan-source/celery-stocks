import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Coinly — Trade. Verify. Share.",
    short_name: "Coinly",
    description:
      "The social network for crypto traders. Share verified trades from connected exchanges, follow other traders, and chat in real time.",
    start_url: "/",
    display: "standalone",
    background_color: "#060C0D",
    theme_color: "#060C0D",
    icons: [
      {
        src: "/icon.png",
        sizes: "500x500",
        type: "image/png",
      },
    ],
  };
}
