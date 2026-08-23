import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "../lib/blog-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://moneymatters.kaesava.au";
  const releaseDate = "2026-08-23T00:00:00.000Z";

  // Static public routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: releaseDate,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: releaseDate,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/subscription/upgrade`,
      lastModified: releaseDate,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: releaseDate,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: releaseDate,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy/delete-account`,
      lastModified: releaseDate,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/sign-in`,
      lastModified: releaseDate,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/sign-up`,
      lastModified: releaseDate,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  // Dynamic blog post routes
  const blogRoutes: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => {
    let parsedDate = releaseDate;
    try {
      const d = new Date(post.publishedAt);
      if (!isNaN(d.getTime())) {
        parsedDate = d.toISOString();
      }
    } catch {
      // Fallback to releaseDate
    }
    return {
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: parsedDate,
      changeFrequency: "monthly",
      priority: 0.7,
    };
  });

  return [...staticRoutes, ...blogRoutes];
}
