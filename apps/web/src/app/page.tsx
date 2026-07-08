import { getAppConfig } from '@money-matters/config';

export default function LandingPage(): JSX.Element {
  const config = getAppConfig('money');

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <header>
        <h1>{config?.landingPage.heroTitle ?? 'Welcome'}</h1>
        <p>{config?.landingPage.heroSubtitle ?? 'The ultimate platform.'}</p>
      </header>
      <section style={{ marginTop: '2rem' }}>
        <h2>Available Features</h2>
        <ul>
          {config && Object.entries(config.components).map(([key, comp]) => (
            <li key={key}>
              <strong>{comp.label}</strong>
              <p>Supports custom fields: {Object.keys(comp.extraFields || {}).join(', ') || 'none'}</p>
            </li>
          ))}
        </ul>
      </section>
      <footer style={{ marginTop: '4rem', color: '#666' }}>
        &copy; {new Date().getFullYear()} {config?.name}. All rights reserved.
      </footer>
    </main>
  );
}
