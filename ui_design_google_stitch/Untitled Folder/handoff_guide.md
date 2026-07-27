# Handoff Guide: Web Application Refactor

This guide is for transitioning your existing desktop dashboard/web app to the "Serene Finance" visual identity. Provide these instructions to your coding agent (Gemini).

## 1. Web-Specific Tailwind Config
Ask Gemini: *"Update my `tailwind.config.js` to include these Serene Finance desktop tokens. Ensure the sidebar width and main content offsets are accounted for."*

```javascript
// tailwind.config.js - Web Extensions
module.exports = {
  theme: {
    extend: {
      spacing: {
        'sidebar': '16rem', // 256px
      },
      maxWidth: {
        'web-content': '1440px',
      },
      // Inherit the same colors from the Mobile Handoff Guide
      colors: {
        primary: { DEFAULT: '#2563eb' },
        surface: {
          DEFAULT: '#faf8ff',
          bright: '#ffffff',
          dim: '#d9d9e5',
          low: '#f3f3fe',
        },
      },
      // ... include borderRadius and boxShadow from Mobile Guide
    },
  },
}
```

## 2. Layout Structure Rules
Ask Gemini: *"Apply this high-level layout structure to our web application to match the Serene Finance design."*

| Feature | Styling Rule | Implementation |
| :--- | :--- | :--- |
| **Shell** | Fixed Sidebar + Scrollable Main | Sidebar at `fixed w-64`, Main at `ml-64` |
| **Top Bar** | Frosted glass header | `sticky top-0 bg-surface/80 backdrop-blur-md` |
| **Grid** | Airy Dashboard Spacing | `grid-cols-3` for accounts, `gap-6` |
| **Tables** | Spacious Rows | `py-5` for table cells, `hover:bg-surface-low` |
| **Typography** | Professional Scale | `text-4xl` for Hero Net Worth, `text-sm` for UI labels |

## 3. The Desktop Components
Give Gemini the "Serene Finance: Web Component Library (TSX)" document and ask:
> "We are building the web counterpart to our mobile app. Use these desktop-specific components (`SideNavBar`, `TopNavBar`, `WebStatCard`, `DesktopTransactionRow`) to refactor our current web views. Ensure the application maintains the fixed sidebar layout and the clean, airy Serene Finance aesthetic."

## 4. CSS Refinement
Ask Gemini: *"Add these web-specific utilities to our global CSS for better numeric readability in tables."*

```css
@layer components {
  /* Ensure financial data is perfectly aligned in wide tables */
  .financial-metric {
    @apply font-mono tabular-nums tracking-tight text-slate-900;
  }
  
  /* Container for desktop views */
  .desktop-container {
    @apply max-w-web-content mx-auto px-8 py-10;
  }
}
```

