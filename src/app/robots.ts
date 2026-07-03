import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/settings"],
      },
    ],
    sitemap: "https://ktuone.in/sitemap.xml",
    host: "https://ktuone.in",
  };
}
