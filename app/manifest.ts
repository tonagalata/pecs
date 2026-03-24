import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PECS Board",
    short_name: "PECS",
    description: "Picture Exchange Communication System for children with autism",
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
