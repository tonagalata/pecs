import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PictoTalk",
    short_name: "PictoTalk",
    description: "Free picture communication board for every age.",
    start_url: "/",
    display: "standalone",
    background_color: "#F2F5F4",
    theme_color: "#1E5C73",
    icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png" }],
  };
}
