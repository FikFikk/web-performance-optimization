// DashboardPage.js - Component-based code splitting
import React, { Suspense, lazy, useState } from 'react';
import { SkeletonLoader } from '../components/LoadingSpinner';

// ✅ LAZY LOAD: Heavy components di-split terpisah
const HeavyChart = lazy(() => import(/* webpackChunkName: "chart" */ '../components/HeavyChart'));
const DataTable = lazy(() => import(/* webpackChunkName: "table" */ '../components/DataTable'));

// Summary cards (lightweight, load langsung)
function SummaryCard({ title, value, change }) {
  return (
    <div className="summary-card">
      <h3>{title}</h3>
      <div className="value">{value}</div>
      <div className={`change ${change >= 0 ? 'positive' : 'negative'}`}>
        {change >= 0 ? '+' : ''}{change}%
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [showChart, setShowChart] = useState(false);
  const [showTable, setShowTable] = useState(false);

  // Prefetch chunks saat user hover (anticipate interaction)
  const prefetchChart = () => {
    import(/* webpackChunkName: "chart" */ '../components/HeavyChart');
  };

  const prefetchTable = () => {
    import(/* webpackChunkName: "table" */ '../components/DataTable');
  };

  return (
    <div className="dashboard-page">
      <h1>Dashboard</h1>
      
      {/* Critical content: Load langsung */}
      <div className="summary-cards">
        <SummaryCard title="Total Users" value="12,345" change={15.3} />
        <SummaryCard title="Revenue" value="$67,890" change={8.7} />
        <SummaryCard title="Orders" value="8,901" change={-2.4} />
        <SummaryCard title="Conversion" value="3.2%" change={0.5} />
      </div>

      {/* Heavy chart: Lazy load on-demand */}
      <div className="chart-section">
        <button 
          onClick={() => setShowChart(true)}
          onMouseEnter={prefetchChart}
          disabled={showChart}
        >
          {showChart ? 'Chart Loaded' : 'Load Chart'}
        </button>

        {showChart && (
          <Suspense fallback={<SkeletonLoader />}>
            <HeavyChart />
          </Suspense>
        )}
      </div>

      {/* Data table: Lazy load on-demand */}
      <div className="table-section">
        <button 
          onClick={() => setShowTable(true)}
          onMouseEnter={prefetchTable}
          disabled={showTable}
        >
          {showTable ? 'Table Loaded' : 'Load Data Table'}
        </button>

        {showTable && (
          <Suspense fallback={<SkeletonLoader />}>
            <DataTable />
          </Suspense>
        )}
      </div>
    </div>
  );
}
