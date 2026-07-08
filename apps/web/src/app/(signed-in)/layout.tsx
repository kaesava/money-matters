import { ReactNode } from 'react';

export default function SignedInLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <aside style={{ width: '250px', background: '#f4f4f5', padding: '1rem' }}>
        <h2>Dashboard</h2>
        <nav>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li><a href="/tasks">Tasks</a></li>
            <li><a href="/projects">Projects</a></li>
          </ul>
        </nav>
      </aside>
      <main style={{ flex: 1, padding: '2rem' }}>
        {children}
      </main>
    </div>
  );
}
