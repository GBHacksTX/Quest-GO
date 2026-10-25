import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "QuestGo",
    short_name: "QuestGo",
    description: "Shared adventures and ESP proximity alerts.",
    start_url: "/explore",
    display: "standalone",
    background_color: "#f3f1e6",
    theme_color: "#264b3a",
    icons: [
      {
        src: "/notification-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/notification-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
