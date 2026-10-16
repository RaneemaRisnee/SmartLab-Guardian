import React from 'react';
import SessionUsageReport from './components/SessionUsageReport';

function App() {
  return (
    <div className="App">
      <header style={{ backgroundColor: '#1e293b', color: 'white', padding: '15px 30px' }}>
        <h1>SmartLab Guardian Dashboard</h1>
      </header>
      <main>
        <SessionUsageReport />
      </main>
    </div>
  );
}

export default App;