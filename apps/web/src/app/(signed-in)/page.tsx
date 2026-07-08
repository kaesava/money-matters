import { getAppConfig } from '@money-matters/config';

export default function Dashboard(): JSX.Element {
  const config = getAppConfig('money');

  return (
    <div>
      <h1>Welcome to {config?.name} Dashboard</h1>
      <p>Select an option from the sidebar to manage your vertical slices.</p>
      <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #e4e4e7', borderRadius: '8px' }}>
        <h3>App Configuration Overview</h3>
        <pre>{JSON.stringify(config, null, 2)}</pre>
      </div>
    </div>
  );
}
