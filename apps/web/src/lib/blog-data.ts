export interface BlogPost {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  readTimeMinutes: number;
  publishedAt: string;
  authorName: string;
  authorRole: string;
  excerpt: string;
  paragraphs: string[];
  keyTakeaways: string[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "why-we-built-money-matters",
    title: "Moving Beyond Spreadsheets: Why We Built Money Matters",
    subtitle: "How a personal 2-tab cashflow spreadsheet evolved into an automated 5-step waterfall engine for Aussie households.",
    category: "FOUNDER STORY",
    readTimeMinutes: 4,
    publishedAt: "August 15, 2026",
    authorName: "Kesh",
    authorRole: "Principal Software Architect & Founder",
    excerpt: "Managing family money shouldn't require complex spreadsheets or endless manual math. Here is why we built an engine that automates cashflow calm.",
    paragraphs: [
      "Like many Aussie households, our family journey started with a simple realization: earning more income doesn't automatically create financial clarity.",
      "When I first moved to Melbourne, money was tight. Every dollar mattered, and a small emergency buffer was the only thing standing between peace of mind and financial stress. Having a clear system for every dollar wasn't optional—it was essential.",
      "As professional life progressed and income grew, so did the financial noise. Without a structured system, cash flow gets messy, bills creep up unexpectedly, and savings goals fall behind.",
      "To stay in control, I built a personal 2-tab spreadsheet that ring-fenced bills and savings before calculating a safe daily spending allowance. It gave our household complete calm—allowing us to plan family milestones and holidays with 100% guilt-free confidence.",
      "Spreadsheets work, but they require constant manual upkeep. Money Matters was built to turn those proven cashflow principles into an automated engine so every household can experience complete payday clarity."
    ],
    keyTakeaways: [
      "Income alone doesn't create financial calm—structured cashflow systems do.",
      "Ring-fencing bills on payday prevents unexpected bill shock.",
      "Automating the manual math frees up mental energy for what truly matters."
    ]
  },
  {
    slug: "the-5-step-payday-waterfall",
    title: "The 5-Step Cashflow Waterfall: Ring-Fencing Bills Before You Spend",
    subtitle: "A mechanical framework for allocating every paycheck the moment it lands in your account.",
    category: "CASHFLOW METHOD",
    readTimeMinutes: 5,
    publishedAt: "August 10, 2026",
    authorName: "Kesh",
    authorRole: "Principal Software Architect & Founder",
    excerpt: "Discover how a self-healing 5-step waterfall prioritizes bill buffers and target goals before calculating your safe daily allowance.",
    paragraphs: [
      "Traditional budgeting asks you to track every cup of coffee after you've spent the money. Backward-looking tracking creates guilt without offering proactive direction.",
      "The 5-Step Cashflow Waterfall flips this paradigm. The moment income lands in your bank account, funds flow automatically through five sequential priorities.",
      "First, any negative category deficits are repaired. Second, your unified Bills Pool is topped up to cover upcoming fixed commitments. Third, committed savings goals are funded.",
      "Fourth, your Everyday discretionary allowance is calculated as a safe daily velocity ($/day). Finally, any residual surplus is automatically swept into your Offset Reserve.",
      "By ring-fencing bills and savings first, you can spend your Everyday allowance with 100% confidence, knowing every obligation is already taken care of."
    ],
    keyTakeaways: [
      "Proactive allocation beats reactive expense tracking every single time.",
      "Prorating bills across pay periods ensures zero payday surprises.",
      "Knowing your exact Daily Pacing Velocity ($/day) eliminates spending anxiety."
    ]
  },
  {
    slug: "why-spreadsheets-fail-aussie-families",
    title: "Why Spreadsheets Break (And Why Household Cashflow Needs an Engine)",
    subtitle: "Excel and Google Sheets are great for static analysis, but struggle with dynamic real-life cashflow.",
    category: "HOUSEHOLD FINANCE",
    readTimeMinutes: 4,
    publishedAt: "August 4, 2026",
    authorName: "Kesh",
    authorRole: "Principal Software Architect & Founder",
    excerpt: "Why spreadsheets break down when income is irregular, bills shift dates, or multiple family members need shared real-time clarity.",
    paragraphs: [
      "Most financially conscious Australians start their budgeting journey with a spreadsheet. They work brilliantly for the first few weeks—until real life happens.",
      "When a bill lands 3 days earlier than expected, or when pay frequencies between partners don't align, static formulas quickly break down or require complex manual adjustments.",
      "Furthermore, spreadsheets lack proactive alerts. They can't warn you 3 days before a direct debit if your bill buffer is $40 short, nor can they instantly compute whether a impulse purchase will impact next week's pacing.",
      "A dedicated cashflow engine combines database integrity, real-time pacing calculations, and multi-user sync so partners stay aligned effortlessly without spending weekends tweaking formulas."
    ],
    keyTakeaways: [
      "Static formulas can't dynamically adjust to shifting bill dates and irregular income.",
      "Proactive push alerts prevent overdrafts before direct debits hit.",
      "Shared partner visibility keeps both decision-makers on the same page."
    ]
  }
];
