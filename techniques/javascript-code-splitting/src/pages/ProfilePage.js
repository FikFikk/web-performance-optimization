// ProfilePage.js
import React from 'react';

export default function ProfilePage() {
  return (
    <div className="page">
      <h2>User Profile</h2>
      <p>Profile page loaded on-demand (separate chunk).</p>
      <div className="profile-card">
        <h3>John Doe</h3>
        <p>Email: john@example.com</p>
        <p>Role: Developer</p>
      </div>
    </div>
  );
}
