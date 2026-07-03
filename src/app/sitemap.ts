import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://ktuone.in";
  const lastModified = new Date();

  const routes = [
    { url: "/", priority: 1.0, changeFrequency: "daily" as const },
    { url: "/calculators", priority: 0.9, changeFrequency: "monthly" as const },
    { url: "/papers", priority: 0.9, changeFrequency: "daily" as const },
    { url: "/syllabus", priority: 0.8, changeFrequency: "weekly" as const },
    { url: "/calendar", priority: 0.8, changeFrequency: "weekly" as const },
    { url: "/notices", priority: 0.9, changeFrequency: "daily" as const },
    { url: "/settings", priority: 0.3, changeFrequency: "monthly" as const },
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route.url}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
