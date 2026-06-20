// AdminPanel.js - Heavy admin-only component
import React from 'react';

// Simulasi heavy admin features
export default function AdminPanel() {
  return (
    <div className="page">
      <h2>Admin Panel</h2>
      <p className="warning">⚠️ This is a HEAVY chunk (180KB+) only loaded for admins!</p>
      
      <div className="admin-stats">
        <h3>System Stats</h3>
        <ul>
          <li>Total Users: 12,345</li>
          <li>Active Sessions: 892</li>
          <li>Database Size: 45.2 GB</li>
          <li>API Calls Today: 1,234,567</li>
        </ul>
      </div>

      <div className="admin-actions">
        <h3>Admin Actions</h3>
        <button>User Management</button>
        <button>Database Backup</button>
        <button>System Logs</button>
        <button>Configuration</button>
      </div>

      <div className="info-box">
        <h4>💡 Code Splitting Win:</h4>
        <p>Regular users NEVER download this 180KB chunk!</p>
        <p>Only admins pay the cost when they access this page.</p>
      </div>
    </div>
  );
}
