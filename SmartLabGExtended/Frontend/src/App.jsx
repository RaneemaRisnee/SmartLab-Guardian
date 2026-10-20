import AlertPanel from './components/AlertPanel';

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>SmartLab Guardian</h1>
        <p>Computer Laboratory Monitoring System</p>
      </header>
      <main>
        {/* TODO (Thenuwara): pass the logged-in admin id: <AlertPanel adminId={admin._id} /> */}
        <AlertPanel />
      </main>
    </div>
  );
}
