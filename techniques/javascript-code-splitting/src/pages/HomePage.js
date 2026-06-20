// HomePage.js
import React from 'react';

export default function HomePage() {
  return (
    <div className="page">
      <h2>Welcome to Code Splitting Demo</h2>
      <p>This is the homepage - loaded immediately as the default route.</p>
      <div className="info-box">
        <h3>✅ What's happening:</h3>
        <ul>
          <li>Main bundle (~45KB) loaded instantly</li>
          <li>React vendor chunk (~156KB) cached and shared</li>
          <li>Other route chunks NOT loaded yet</li>
          <li>Total initial payload: ~200KB (vs 800KB without splitting)</li>
        </ul>
      </div>
    </div>
  );
}
