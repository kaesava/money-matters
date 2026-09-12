import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AppProviders } from "../providers/AppProviders";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
};

const baseUrl = "https://moneymatters.kaesava.au";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Money Matters — Zero bill shock. Real progress on long-term goals. Zero daily tracking.",
    template: "%s | Money Matters",
  },
  description:
    "Ring-fence upcoming bills on payday, make real progress on long-term goals, and spend your everyday money with zero guilt and zero micro-tracking.",
  keywords: [
    "household budgeting Australia",
    "zero bill shock",
    "long-term goals tracker",
    "zero daily tracking budget",
    "Australian budget planner",
    "5-step waterfall budget",
    "mortgage offset account optimizer",
    "forward looking paycheck allocation",
    "zero based budget app",
    "Serene Finance",
    "money matters",
    "automated paycheck allocation",
    "payday cashflow management",
  ],
  authors: [{ name: "Money Matters Team", url: baseUrl }],
  creator: "Money Matters",
  publisher: "Money Matters",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: baseUrl,
    languages: {
      "en-AU": baseUrl,
      "ja-JP": `${baseUrl}?lang=ja`,
    },
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.ico",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "Money Matters — Zero bill shock. Real progress on long-term goals. Zero daily tracking.",
    description:
      "Ring-fence upcoming bills on payday, make real progress on long-term goals, and spend your everyday money with zero guilt and zero micro-tracking.",
    url: baseUrl,
    siteName: "Money Matters",
    locale: "en_AU",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Money Matters — Zero bill shock. Real progress on long-term goals. Zero daily tracking.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Money Matters — Zero bill shock. Real progress on long-term goals.",
    description: "Zero bill shock. Real progress on long-term goals. Zero daily tracking for Aussie households.",
    images: ["/og-image.png"],
    creator: "@money_matters",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// JSON-LD Structured Data Schema for Search Engine Snippets (SERPs)
const webAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Money Matters — Zero bill shock. Real progress on long-term goals.",
  "operatingSystem": "Web, iOS, Android",
  "applicationCategory": "FinanceApplication",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "AUD",
    "availability": "https://schema.org/InStock",
  },
  "description":
    "Ring-fence upcoming bills on payday, make real progress on long-term goals, and spend your everyday money with zero guilt and zero micro-tracking.",
  "url": baseUrl,
  "author": {
    "@type": "Organization",
    "name": "Money Matters",
    "url": baseUrl,
  },
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Money Matters",
  "url": baseUrl,
  "logo": `${baseUrl}/og-image.png`,
  "sameAs": ["https://kaesava.au"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased scroll-smooth`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
