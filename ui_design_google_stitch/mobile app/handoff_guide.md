# Handoff Guide: Restyling your App to "Serene Finance"

Use this guide with your coding agent (Gemini) to apply the new visual identity to your existing codebase.

## 1. The Design Tokens (Tailwind Config)
Ask Gemini: *"Update my `tailwind.config.js` to include these 'Serene Finance' tokens for colors, typography, and borders. Ensure these are integrated into the theme extension."*

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563eb', // Serene Blue (High Trust)
          container: '#f3f3fe',
        },
        surface: {
          DEFAULT: '#faf8ff', // Main App Background
          bright: '#ffffff',  // Cards, Modals, Containers
          dim: '#d9d9e5',     // Borders, Dividers, Inactive States
          low: '#f3f3fe',
        },
        semantic: {
          success: '#22c55e', // Growth Green (Inflows)
          error: '#ba1a1a',   // Burn Red (Outflows)
          warning: '#f59e0b',
        },
        'on-surface': '#1a1c1e',
        'on-surface-variant': '#505f76',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // General UI text
        mono: ['JetBrains Mono', 'monospace'], // All currency & numeric data
      },
      borderRadius: {
        'serene': '12px',    // Standard radius for buttons & cards
        'serene-lg': '16px', // Large radius for main containers
      },
      boxShadow: {
        'serene-sm': '0 2px 4px rgba(0,0,0,0.02)',
        'serene-md': '0 4px 12px rgba(37, 99, 235, 0.04)',
      }
    },
  },
}
```

## 2. Component Refactoring Rules

Refactor your existing screens: Once the components are created, you can tell Gemini: "Now update my existing screens to use these library components, passing the appropriate props while keeping our current data-fetching logic intact."

Ask Gemini: *"Review my existing UI components and apply these specific styling rules from the new design system:"*

| Component | Styling Rule | Tailwind Classes |
| :--- | :--- | :--- |
| **Buttons** | Primary action with subtle lift | `bg-primary text-white rounded-serene shadow-serene-md` |
| **Cards** | Airy, white, thin border | `bg-surface-bright border border-surface-dim/50 rounded-serene-lg shadow-serene-sm` |
| **Metrics** | Financial data must align | `font-mono tabular-nums tracking-tight` |
| **Badges** | Status indicators | `rounded-full px-3 py-1 font-bold text-xs uppercase` |
| **Navigation** | Clean white background | `bg-surface-bright border-b border-surface-dim` |

Ask Gemini: *"Use the reusable components in components.md to merge into the components/ directory of our monorepo."* Override based on the definitions here.


## 3. Global Styles
Ask Gemini: *"Update my `globals.css` to set the new baseline aesthetic."*

```css
@layer base {
  body {
    @apply bg-surface text-on-surface antialiased;
  }
  h1, h2, h3 {
    @apply font-sans font-bold tracking-tight text-slate-900;
  }
}

/* Custom class for any financial figure */
.financial-metric {
  @apply font-mono tabular-nums;
}
```

## 4. How to use the Visual References
Tell Gemini: *"I have visual references for the Dashboard, Transactions, and Budgets. I will provide the HTML source for these screens. Use the structure and Tailwind classes from these references to refactor my existing screens, keeping my current logic and data fetching intact."*
