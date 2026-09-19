import React from 'react';

function App() {
  return (
    <div className="phase-hero">
      <div className="phase-card">
        <div className="phase-badge">
          <span>🍽️</span> RESTOSMART Foundation Ready
        </div>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.75rem', color: 'var(--primary)' }}>
          RESTOSMART
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
          Restaurant Automation System – Foundation and architecture skeleton successfully initialized.
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.75rem',
          textAlign: 'left',
          fontSize: '0.85rem',
          background: 'var(--bg-secondary)',
          padding: '1rem',
          borderRadius: 'var(--radius)',
          color: 'var(--text-secondary)'
        }}>
          <div>✅ <strong>React 18 + Vite SPA</strong></div>
          <div>✅ <strong>Express.js API Server</strong></div>
          <div>✅ <strong>MongoDB Atlas Schemas</strong></div>
          <div>✅ <strong>Configurable Gemini Model</strong></div>
        </div>
      </div>
    </div>
  );
}

export default App;
