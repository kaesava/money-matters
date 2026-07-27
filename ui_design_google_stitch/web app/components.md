# Serene Finance: Desktop Web Component Library (TSX)

These components are optimized for desktop screen real estate, featuring larger containers, hover states, and sidebar-integrated layouts. Use these with your coding agent to build out the web version of Serene Finance.

---

## 1. Navigation & Shell

### SideNavBar.tsx
The primary navigation anchor for the desktop experience.

```tsx
import React from 'react';

interface NavItem {
  label: string;
  icon: string;
  id: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'transactions', label: 'Transactions', icon: 'receipt_long' },
  { id: 'budgets', label: 'Budgets', icon: 'pie_chart' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export const SideNavBar: React.FC<{ activeId: string }> = ({ activeId }) => {
  return (
    <aside className="w-64 h-screen fixed left-0 top-0 bg-surface-bright border-r border-surface-dim flex flex-col p-6 z-50">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white">
          <span className="material-icons text-2xl">account_balance</span>
        </div>
        <div>
          <h2 className="font-bold text-lg text-on-surface leading-tight">Serene</h2>
          <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">Finance</p>
        </div>
      </div>
      
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-serene transition-all group ${
              activeId === item.id 
                ? 'bg-primary/5 text-primary' 
                : 'text-on-surface-variant hover:bg-surface-low hover:text-on-surface'
            }`}
          >
            <span className="material-icons-outlined">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="pt-6 border-t border-surface-dim mt-auto">
        <button className="w-full bg-primary text-white py-3 rounded-serene font-bold shadow-serene-md hover:brightness-110 active:scale-95 transition-all">
          Add Transaction
        </button>
      </div>
    </aside>
  );
};
```

### TopNavBar.tsx
Handles search and user profile, fixed at the top of the main content area.

```tsx
import React from 'react';

export const TopNavBar: React.FC<{ title: string }> = ({ title }) => {
  return (
    <header className="h-16 sticky top-0 bg-surface/80 backdrop-blur-md border-b border-surface-dim px-8 flex items-center justify-between z-40 ml-64">
      <h1 className="text-xl font-bold text-on-surface">{title}</h1>
      <div className="flex items-center gap-6">
        <div className="relative w-80">
          <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
          <input 
            className="w-full bg-surface-low border border-surface-dim/50 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            placeholder="Search accounts or data..."
          />
        </div>
        <div className="flex items-center gap-4 border-l border-surface-dim pl-6">
          <button className="text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-icons-outlined">notifications</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="text-right hidden xl:block">
              <p className="text-sm font-bold text-on-surface">Alex Thompson</p>
              <p className="text-[10px] text-on-surface-variant font-bold uppercase">Premium Member</p>
            </div>
            <img 
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=100&h=100&q=80" 
              className="w-10 h-10 rounded-full border-2 border-primary/10 object-cover" 
              alt="Profile"
            />
          </div>
        </div>
      </div>
    </header>
  );
};
```

---

## 2. Desktop Cards & Layouts

### WebStatCard.tsx
Balanced for the dashboard grid.

```tsx
import React from 'react';

interface WebStatCardProps {
  title: string;
  accountNumber: string;
  balance: number;
  icon: string;
}

export const WebStatCard: React.FC<WebStatCardProps> = ({ title, accountNumber, balance, icon }) => {
  return (
    <div className="bg-surface-bright p-8 rounded-serene-lg border border-surface-dim/50 shadow-serene-sm hover:shadow-serene-md transition-shadow group flex flex-col gap-6">
      <div className="flex justify-between items-start">
        <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
          <span className="material-icons-outlined">{icon}</span>
        </div>
        <button className="text-surface-dim hover:text-on-surface-variant">
          <span className="material-icons">more_vert</span>
        </button>
      </div>
      <div>
        <p className="text-sm font-medium text-on-surface-variant mb-1">{title}</p>
        <p className="font-mono text-xs text-on-surface-variant/60 tracking-widest">**** {accountNumber}</p>
      </div>
      <p className="financial-metric text-3xl font-bold text-on-surface">
        {balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
      </p>
    </div>
  );
};
```

### DesktopTransactionRow.tsx
Optimized for wide tables.

```tsx
import React from 'react';

export const DesktopTransactionRow: React.FC<{
  date: string;
  title: string;
  category: string;
  amount: number;
  status: string;
}> = ({ date, title, category, amount, status }) => {
  const isOutflow = amount < 0;
  
  return (
    <tr className="border-b border-surface-dim/30 hover:bg-surface-low/50 transition-colors group">
      <td className="py-5 text-sm text-on-surface-variant font-medium">{date}</td>
      <td className="py-5">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
            <span className="material-icons-outlined text-sm">receipt</span>
          </div>
          <span className="font-bold text-on-surface">{title}</span>
        </div>
      </td>
      <td className="py-5">
        <span className="px-3 py-1 rounded-full bg-surface-low text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">
          {category}
        </span>
      </td>
      <td className="py-5 text-right">
        <p className={`financial-metric font-bold text-lg ${isOutflow ? 'text-semantic-error' : 'text-semantic-success'}`}>
          {isOutflow ? '' : '+'}{amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
        </p>
      </td>
    </tr>
  );
};
```

---

## 3. Web Global Setup
Ensure these remain consistent in your web package.

```css
/* Web-specific baseline */
.main-content {
  @apply ml-64 min-h-screen bg-surface p-8 pt-0;
}

.dashboard-grid {
  @apply grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6;
}

/* Numeric alignment for tables */
.financial-metric {
  @apply font-mono tabular-nums tracking-tight;
}
```

