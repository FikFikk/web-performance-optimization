// App.js - Route-based code splitting
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

// ✅ LAZY LOAD: Semua routes di-split menjadi chunks terpisah
const HomePage = lazy(() => import(/* webpackChunkName: "home" */ './pages/HomePage'));
const DashboardPage = lazy(() => import(/* webpackChunkName: "dashboard" */ './pages/DashboardPage'));
const ProfilePage = lazy(() => import(/* webpackChunkName: "profile" */ './pages/ProfilePage'));
const SettingsPage = lazy(() => import(/* webpackChunkName: "settings" */ './pages/SettingsPage'));
const AdminPanel = lazy(() => import(/* webpackChunkName: "admin" */ './pages/AdminPanel'));
const ReportsPage = lazy(() => import(/* webpackChunkName: "reports" */ './pages/ReportsPage'));

function Navigation() {
  return (
    <nav className="navigation">
      <Link to="/">Home</Link>
      <Link to="/dashboard">Dashboard</Link>
      <Link to="/profile">Profile</Link>
      <Link to="/settings">Settings</Link>
      <Link to="/admin">Admin</Link>
      <Link to="/reports">Reports</Link>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="app-header">
          <h1>Code Splitting Demo</h1>
          <Navigation />
        </header>

        <main className="app-content">
          <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/reports" element={<ReportsPage />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
