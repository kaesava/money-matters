"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { Logo } from "@money-matters/ui/web";
import { BLOG_POSTS } from "../../../lib/blog-data";

export default function BlogPostReaderPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;

  const post = BLOG_POSTS.find((p) => p.slug === slug);

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#F7F8FA] text-[#1B2B4B]">
        <h1 className="text-2xl font-bold mb-2">Article Not Found</h1>
        <p className="text-xs text-zinc-500 mb-4">The requested article slug could not be located.</p>
        <button
          onClick={() => router.push("/blog")}
          className="bg-[#2563eb] text-white font-bold text-xs px-4 py-2 rounded-xl"
        >
          ← Back to Blog
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FA] text-[#1B2B4B] font-sans selection:bg-[#2563eb] selection:text-white">
      {/* Header */}
      <header className="border-b border-[#e2e4e0] bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-2xs">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div
            onClick={() => router.push("/")}
            className="flex items-center gap-3 cursor-pointer"
          >
            <Logo size="md" />
            <span className="text-xl font-extrabold tracking-tight text-[#1B2B4B]">
              {t("app.title")}
            </span>
          </div>
          <button
            onClick={() => router.push("/blog")}
            className="text-xs font-bold text-[#2563eb] hover:underline flex items-center gap-1"
          >
            ← Back to Articles
          </button>
        </div>
      </header>

      {/* Article Header Container */}
      <main className="max-w-3xl mx-auto px-6 pt-12 pb-20 flex-1 w-full space-y-8">
        <div className="space-y-4 border-b border-[#e2e4e0] pb-8">
          <div className="flex items-center gap-3 text-xs font-bold font-mono">
            <span className="text-[#2563eb] bg-blue-50 px-3 py-1 rounded-md border border-blue-100 uppercase">
              {post.category}
            </span>
            <span className="text-zinc-400">•</span>
            <span className="text-zinc-500">{post.readTimeMinutes} min read</span>
            <span className="text-zinc-400">•</span>
            <span className="text-zinc-500">{post.publishedAt}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#1B2B4B] leading-tight">
            {post.title}
          </h1>

          <p className="text-base sm:text-lg text-zinc-600 leading-relaxed font-medium">
            {post.subtitle}
          </p>

          {/* Author Badge */}
          <div className="flex items-center gap-3 pt-4">
            <div className="w-10 h-10 rounded-full bg-[#1B2B4B] text-white flex items-center justify-center font-bold text-sm font-mono shadow-xs">
              {post.authorName[0]}
            </div>
            <div>
              <p className="text-xs font-bold text-[#1B2B4B]">{post.authorName}</p>
              <p className="text-[11px] text-zinc-500">{post.authorRole}</p>
            </div>
          </div>
        </div>

        {/* Article Body */}
        <article className="space-y-6 text-base text-zinc-700 leading-relaxed">
          {post.paragraphs.map((para, idx) => (
            <p key={idx} className="text-justify sm:text-left leading-8">
              {para}
            </p>
          ))}
        </article>

        {/* Key Takeaways Card */}
        {post.keyTakeaways.length > 0 && (
          <div className="p-6 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-3 mt-8">
            <h4 className="text-xs font-bold text-[#2563eb] uppercase tracking-wider">
              Key Takeaways
            </h4>
            <ul className="space-y-2 text-xs font-semibold text-blue-950">
              {post.keyTakeaways.map((takeaway, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[#2563eb]">✓</span>
                  <span>{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Conversion Banner Callout */}
        <div className="mt-12 p-8 rounded-2xl bg-[#1B2B4B] text-white text-center space-y-4 shadow-xl">
          <h3 className="text-xl sm:text-2xl font-bold">Experience Automated Cashflow Calm</h3>
          <p className="text-xs sm:text-sm text-zinc-300 max-w-xl mx-auto leading-relaxed">
            Ready to replace spreadsheet maintenance with a self-healing 5-step waterfall?
          </p>
          <button
            onClick={() => router.push("/")}
            className="bg-[#2563eb] hover:bg-blue-700 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all shadow-md inline-block"
          >
            Start 60-Day Free Trial
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e2e4e0] bg-[#F7F8FA] py-8 text-center text-xs text-zinc-500">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="font-semibold">
            {t("landing.copyright", { appName: t("app.title") })}
          </span>
          <div className="flex gap-4 font-semibold">
            <Link href="/blog" className="hover:underline text-[#2563eb]">All Articles</Link>
            <a href="/privacy" className="hover:underline text-[#2563eb]">{t("landing.privacyPolicy")}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
