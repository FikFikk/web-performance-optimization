// ReportsPage.js
import React from 'react';

export default function ReportsPage() {
  return (
    <div className="page">
      <h2>Reports</h2>
      <p>Reports page loaded on-demand.</p>
      <div className="reports-list">
        <div className="report-item">
          <h3>Monthly Revenue Report</h3>
          <button>Download PDF</button>
        </div>
        <div className="report-item">
          <h3>User Activity Report</h3>
          <button>Download PDF</button>
        </div>
      </div>
    </div>
  );
}
