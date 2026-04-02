import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PictoTalk",
    short_name: "PictoTalk",
    description: "Free picture communication board powered by ARASAAC pictograms.",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#3b82f6",
    theme_color: "#3b82f6",
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
