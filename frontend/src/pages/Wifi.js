// src/components/WifiConfigPage.jsx
import React, { useState } from 'react';
import axios from 'axios';

export default function WifiConfigPage() {
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');

  // press feedback handlers + shared transition style
  const handlePress = (e) => { e.currentTarget.style.transform = 'scale(0.97)'; };
  const handleRelease = (e) => { e.currentTarget.style.transform = 'scale(1)'; };
  const btnBase = {
    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    cursor: 'pointer',
  };

  const handleChangeNetwork = async (e) => {
    e.preventDefault();
    setStatus('Changing network…');
    try {
      const { data } = await axios.post(`/changewifi`, { ssid, password });
      if (data.success) {
        setStatus(
          'Network change requested. Device will reconnect shortly. Refresh the page in a moment.'
        );
      } else {
        setStatus(`Error: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      setStatus(`Error: ${err.response?.data?.error || err.message}`);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '1rem',
        boxSizing: 'border-box',
        background: '#f0f2f5',
      }}
    >
      <form
        onSubmit={handleChangeNetwork}
        style={{
          background: '#fff',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: '400px',
          textAlign: 'center',
        }}
      >
        <h1 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>
          Change Wi-Fi Network
        </h1>

        <label
          htmlFor="ssid"
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            textAlign: 'left',
            fontSize: '1rem',
          }}
        >
          Network Name (SSID)
        </label>
        <input
          id="ssid"
          type="text"
          value={ssid}
          onChange={(e) => setSsid(e.target.value)}
          required
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '1rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            marginBottom: '1.5rem',
            boxSizing: 'border-box',
          }}
        />

        <label
          htmlFor="password"
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            textAlign: 'left',
            fontSize: '1rem',
          }}
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '1rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            marginBottom: '1.5rem',
            boxSizing: 'border-box',
          }}
        />

        <button
          type="submit"
          onMouseDown={handlePress}
          onMouseUp={handleRelease}
          onMouseLeave={handleRelease}
          onTouchStart={handlePress}
          onTouchEnd={handleRelease}
          style={{
            ...btnBase,
            width: '100%',
            padding: '1rem',
            fontSize: '1.25rem',
            border: 'none',
            borderRadius: '4px',
            background: '#007bff',
            color: '#fff',
          }}
        >
          Change Network
        </button>

        {status && (
          <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#333' }}>
            {status}
          </p>
        )}
      </form>
    </div>
  );
}
