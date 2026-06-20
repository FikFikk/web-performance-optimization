// index.js - Entry point dengan code splitting
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { reportWebVitals } from './reportWebVitals';

// Render aplikasi
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Monitor Web Vitals
reportWebVitals(console.log);
