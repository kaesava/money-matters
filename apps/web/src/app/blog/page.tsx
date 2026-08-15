"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { Logo } from "@money-matters/ui/web";
import { BLOG_POSTS } from "../../lib/blog-data";

export default function BlogIndexPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FA] text-[#1B2B4B] font-sans selection:bg-[#2563eb] selection:text-white">
      {/* Header */}
      <header className="border-b border-[#e2e4e0] bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-2xs">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div
            onClick={() => router.push("/")}
            className="flex items-center gap-3 cursor-pointer"
          >
            <Logo size="md" />
            <span className="text-xl font-extrabold tracking-tight text-[#1B2B4B]">
              {t("app.title")}
            </span>
            <span className="text-xs font-bold font-mono text-[#2563eb] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              BLOG
            </span>
          </div>
          <button
            onClick={() => router.push("/")}
            className="text-xs font-bold text-zinc-600 hover:text-[#1B2B4B] transition-colors"
          >
            {t("landing.blogBackToBlog", { defaultValue: "← Back to Home" })}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-12 text-center flex flex-col items-center gap-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563eb] tracking-wider uppercase">
          {t("landing.blogSectionBadge", { defaultValue: "Insights & Guides" })}
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#1B2B4B]">
          {t("landing.blogSectionHeading", { defaultValue: "Practical Systems for Household Cashflow" })}
        </h1>
        <p className="text-base text-zinc-600 max-w-2xl leading-relaxed">
          {t("landing.blogSectionSubheading", { defaultValue: "Actionable frameworks and engineering principles to automate your family's financial calm." })}
        </p>
      </section>

      {/* Blog Cards Grid */}
      <main className="max-w-6xl mx-auto px-6 pb-24 flex-1 w-full">
        <div className="grid md:grid-cols-3 gap-8">
          {BLOG_POSTS.map((post) => (
            <article
              key={post.slug}
              onClick={() => router.push(`/blog/${post.slug}`)}
              className="p-6 rounded-2xl bg-white border border-[#e2e4e0] shadow-2xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between gap-6 group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 text-[10px] font-bold font-mono">
                  <span className="text-[#2563eb] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100 uppercase">
                    {post.category}
                  </span>
                  <span className="text-zinc-400">{post.readTimeMinutes} min read</span>
                </div>
                <h2 className="text-xl font-bold text-[#1B2B4B] group-hover:text-[#2563eb] transition-colors leading-snug">
                  {post.title}
                </h2>
                <p className="text-zinc-600 text-xs leading-relaxed line-clamp-3">
                  {post.excerpt}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-zinc-100 text-xs">
                <span className="font-semibold text-zinc-400">{post.publishedAt}</span>
                <span className="font-bold text-[#2563eb] group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  Read Article &rarr;
                </span>
              </div>
            </article>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e2e4e0] bg-[#F7F8FA] py-8 text-center text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="font-semibold">
            {t("landing.copyright", { appName: t("app.title") })} • Contact: <a href="mailto:info@moneymatters.kaesava.au" className="text-[#2563eb] hover:underline">info@moneymatters.kaesava.au</a>
          </span>
          <div className="flex gap-4 font-semibold">
            <Link href="/" className="hover:underline text-[#2563eb]">Home</Link>
            <a href="/privacy" className="hover:underline text-[#2563eb]">{t("landing.privacyPolicy")}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
