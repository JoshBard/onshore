// src/components/Header.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/upload', label: 'Upload Coordinates' },
  { to: '/map', label: 'Select Coordinates' },
  { to: '/manual', label: 'Manual Control Mode' },
  { to: '/wifi', label: 'Change Network' },
];

export default function Header() {
  return (
    <header
      style={{
        display: 'flex',
        flexWrap: 'wrap',          
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#333',
        padding: '10px',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
      }}
    >
      {navItems.map(({ to, label }) => (
        <Link
          key={to}
          to={to}
          style={{
            margin: '5px',
            textDecoration: 'none',
          }}
        >
          <button
            style={{
              padding: '12px 20px',     
              minWidth: '100px',        
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        </Link>
      ))}
    </header>
  );
}
