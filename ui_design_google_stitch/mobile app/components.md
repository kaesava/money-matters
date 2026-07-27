# Comprehensive Component Library: Serene Finance

These React components are designed to be dropped into your monorepo. They use the Tailwind tokens defined in your `tailwind.config.js`.

---


## 1. Navigation Components

### TopAppBar.tsx
The primary header for mobile views, featuring a user profile, brand title, and notification toggle.

```tsx
import React from 'react';

interface TopAppBarProps {
  title: string;
  userAvatar?: string;
  onNotificationClick?: () => void;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({ 
  title, 
  userAvatar = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
  onNotificationClick 
}) => {
  return (
    <header className="sticky top-0 z-50 w-full bg-surface/80 backdrop-blur-md border-b border-surface-dim px-4 h-16 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img src={userAvatar} alt="Profile" className="w-10 h-10 rounded-full border-2 border-primary/20 object-cover" />
        <h1 className="text-xl font-bold text-primary tracking-tight">{title}</h1>
      </div>
      <button 
        onClick={onNotificationClick}
        className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:bg-surface-low rounded-full transition-colors"
      >
        <span className="material-icons-outlined">notifications</span>
      </button>
    </header>
  );
};
```

### BottomNavBar.tsx
Standard mobile navigation with active state tracking.

```tsx
import React from 'react';

interface NavItem {
  label: string;
  icon: string;
  id: string;
}

interface BottomNavBarProps {
  activeId: string;
  onNavigate: (id: string) => void;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid_view' },
  { id: 'ledger', label: 'Ledger', icon: 'account_balance_wallet' },
  { id: 'budgets', label: 'Budgets', icon: 'pie_chart' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeId, onNavigate }) => {
  return (
    <nav className="fixed bottom-0 left-0 w-full bg-surface-bright border-t border-surface-dim px-4 pb-safe pt-2 flex justify-around items-center z-50">
      {navItems.map((item) => {
        const isActive = activeId === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
              isActive ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-low'
            }`}
          >
            <span className="material-icons text-2xl">{item.icon}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
```

---

## 2. Layout & Data Display

### Card.tsx
The foundational container for all UI elements.

```tsx
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  action?: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, title, action, className = "" }) => {
  return (
    <div className={`bg-surface-bright border border-surface-dim/50 rounded-serene-lg shadow-serene-sm overflow-hidden ${className}`}>
      {title && (
        <div className="px-5 py-4 border-b border-surface-dim/30 flex justify-between items-center">
          <h3 className="font-bold text-on-surface uppercase text-xs tracking-widest">{title}</h3>
          {action}
        </div>
      )}
      <div className="p-5">
        {children}
      </div>
    </div>
  );
};
```

### StatCard.tsx
For balance and account summaries.

```tsx
import React from 'react';

interface StatCardProps {
  title: string;
  accountNumber?: string;
  balance: number;
  variant?: 'primary' | 'outline';
}

export const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  accountNumber, 
  balance, 
  variant = 'primary' 
}) => {
  const styles = variant === 'primary' 
    ? "bg-primary text-white shadow-serene-md" 
    : "bg-surface-bright border border-surface-dim/50 text-on-surface shadow-serene-sm";

  return (
    <div className={`${styles} p-6 rounded-serene-lg min-w-[280px] relative overflow-hidden`}>
      {variant === 'primary' && (
        <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
      )}
      <div className="relative z-10 flex flex-col gap-8">
        <div className="flex justify-between items-start">
          <div>
            <p className={`text-sm font-medium ${variant === 'primary' ? 'text-white/80' : 'text-on-surface-variant'}`}>{title}</p>
            {accountNumber && <p className="font-mono text-xs tracking-widest mt-0.5 opacity-60">**** {accountNumber}</p>}
          </div>
          <span className="material-icons-outlined opacity-60">account_balance_wallet</span>
        </div>
        <p className="financial-metric text-3xl font-bold tracking-tight">
          {balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
        </p>
      </div>
    </div>
  );
};
```

### BudgetProgress.tsx
Visual spending tracking.

```tsx
import React from 'react';

interface BudgetProps {
  category: string;
  icon: string;
  spent: number;
  limit: number;
  status: 'On Track' | 'Warning' | 'Over';
}

export const BudgetProgress: React.FC<BudgetProps> = ({ category, icon, spent, limit, status }) => {
  const percentage = Math.min((spent / limit) * 100, 100);
  const statusColor = {
    'On Track': 'bg-semantic-success',
    'Warning': 'bg-semantic-warning',
    'Over': 'bg-semantic-error'
  }[status];

  return (
    <div className="bg-surface-bright p-5 rounded-serene-lg border border-surface-dim/50 shadow-serene-sm">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-low flex items-center justify-center text-primary">
            <span className="material-icons-outlined">{icon}</span>
          </div>
          <span className="font-bold text-on-surface">{category}</span>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
          status === 'On Track' ? 'text-semantic-success bg-semantic-success/10' : 'text-semantic-warning bg-semantic-warning/10'
        }`}>
          {status}
        </span>
      </div>
      <div className="w-full h-2 bg-surface-low rounded-full overflow-hidden mb-3">
        <div className={`${statusColor} h-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
      </div>
      <div className="flex justify-between text-sm">
        <span className="financial-metric font-bold">${spent.toLocaleString()}</span>
        <span className="text-on-surface-variant">/ <span className="financial-metric">${limit.toLocaleString()}</span></span>
      </div>
    </div>
  );
};
```

---

## 3. Interaction & Forms

### QuickAction.tsx
Circular buttons for dashboard workflows.

```tsx
import React from 'react';

interface ActionProps {
  label: string;
  icon: string;
  onClick?: () => void;
}

export const QuickAction: React.FC<ActionProps> = ({ label, icon, onClick }) => {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center gap-3 group active:scale-95 transition-all"
    >
      <div className="w-14 h-14 rounded-2xl bg-surface-bright border border-surface-dim/50 shadow-serene-sm flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
        <span className="material-icons-outlined text-2xl">{icon}</span>
      </div>
      <span className="text-xs font-bold text-on-surface-variant tracking-tight">{label}</span>
    </button>
  );
};
```

### SearchInput.tsx
The standardized input field for lists.

```tsx
import React from 'react';

interface SearchProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const SearchInput: React.FC<SearchProps> = (props) => {
  return (
    <div className="relative w-full">
      <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">search</span>
      <input 
        {...props}
        className="w-full bg-surface-low border border-surface-dim/50 rounded-serene-lg pl-12 pr-4 py-3 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        placeholder="Search transactions..."
      />
    </div>
  );
};
```

### SettingsItem.tsx
Standardized rows for settings and lists.

```tsx
import React from 'react';

interface SettingsItemProps {
  label: string;
  icon: string;
  value?: string;
  onClick?: () => void;
}

export const SettingsItem: React.FC<SettingsItemProps> = ({ label, icon, value, onClick }) => {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 bg-surface-bright hover:bg-surface-low transition-colors group"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
          <span className="material-icons-outlined">{icon}</span>
        </div>
        <span className="font-medium text-on-surface">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-sm text-on-surface-variant">{value}</span>}
        <span className="material-icons text-surface-dim group-hover:text-on-surface-variant transition-colors">chevron_right</span>
      </div>
    </button>
  );
};
```

### Component Implementation: Button.tsx

```tsx
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'error';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md', 
  isLoading, 
  children, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-sans font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none rounded-serene";
  
  const variants = {
    primary: "bg-primary text-white shadow-serene-md hover:brightness-110",
    secondary: "bg-surface-low text-primary border border-surface-dim hover:bg-surface-dim/20",
    ghost: "bg-transparent text-on-surface-variant hover:bg-surface-low",
    error: "bg-semantic-error text-white shadow-serene-md hover:brightness-110"
  };

  const sizes = {
    sm: "px-4 py-1.5 text-sm",
    md: "px-6 py-2.5 text-base",
    lg: "px-8 py-3.5 text-lg"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
};
```

### Component Implementation: TransactionCard.tsx

```tsx
import React from 'react';

interface TransactionProps {
  title: string;
  category: string;
  time: string;
  amount: number;
  status?: 'Pending' | 'Completed' | 'Failed';
  icon?: React.ReactNode;
}

export const TransactionCard: React.FC<TransactionProps> = ({
  title,
  category,
  time,
  amount,
  status = 'Completed',
  icon
}) => {
  const isPositive = amount > 0;

  return (
    <div className="bg-surface-bright p-4 rounded-serene-lg border border-surface-dim/50 shadow-serene-sm flex justify-between items-center hover:shadow-serene-md transition-shadow">
      <div className="flex gap-4 items-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          {icon || <div className="w-6 h-6 bg-current opacity-20 rounded-sm" />}
        </div>
        <div>
          <p className="font-sans font-bold text-on-surface">{title}</p>
          <p className="text-sm text-on-surface-variant">
            {category} • {time}
          </p>
        </div>
      </div>
      
      <div className="text-right">
        <p className={`financial-metric font-bold text-lg ${isPositive ? 'text-semantic-success' : 'text-semantic-error'}`}>
          {isPositive ? '+' : ''}{amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
        </p>
        {status === 'Pending' && (
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold bg-surface-low px-2 py-0.5 rounded-full inline-block mt-1">
            {status}
          </p>
        )}
      </div>
    </div>
  );
};
```

### Component Implementation: Badge.tsx

```tsx
import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'info' }) => {
  const variants = {
    success: "bg-semantic-success/10 text-semantic-success border-semantic-success/20",
    warning: "bg-semantic-warning/10 text-semantic-warning border-semantic-warning/20",
    error: "bg-semantic-error/10 text-semantic-error border-semantic-error/20",
    info: "bg-primary/10 text-primary border-primary/20"
  };

  return (
    <span className={`px-3 py-1 rounded-full font-sans font-bold text-[10px] uppercase tracking-wider border ${variants[variant]}`}>
      {children}
    </span>
  );
};
```


