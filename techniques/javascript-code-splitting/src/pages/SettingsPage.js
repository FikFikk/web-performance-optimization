// SettingsPage.js
import React from 'react';

export default function SettingsPage() {
  return (
    <div className="page">
      <h2>Settings</h2>
      <p>Settings page loaded on-demand.</p>
      <div className="settings-form">
        <label>
          <input type="checkbox" /> Enable notifications
        </label>
        <label>
          <input type="checkbox" /> Dark mode
        </label>
      </div>
    </div>
  );
}
