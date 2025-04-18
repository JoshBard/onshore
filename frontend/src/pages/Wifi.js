// src/components/WifiConfigPage.jsx
import React, { useState } from 'react';
import axios from 'axios';

export default function WifiConfigPage() {
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');

  const handleChangeNetwork = async (e) => {
    e.preventDefault();
    setStatus('Changing network…');
    try {
      const { data } = await axios.post('/changewifi', { ssid, password });
      if (data.success) {
        setStatus('Network change requested. Device will reconnect shortly. Refresh the page in a moment.');
      } else {
        setStatus(`Error: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      setStatus(`Error: ${err.response?.data?.error || err.message}`);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: '#f0f2f5'
    }}>
      <form onSubmit={handleChangeNetwork} style={{
        background: '#fff',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center'
      }}>
        <h1 style={{ marginBottom: '1.5rem' }}>Change Wi‑Fi Network</h1>

        <label htmlFor="ssid" style={{ display: 'block', marginBottom: '0.5rem', textAlign: 'left' }}>
          Network Name (SSID)
        </label>
        <input
          id="ssid"
          type="text"
          value={ssid}
          onChange={e => setSsid(e.target.value)}
          required
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '1rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            marginBottom: '1.5rem'
          }}
        />

        <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem', textAlign: 'left' }}>
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '1rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            marginBottom: '1.5rem'
          }}
        />

        <button type="submit" style={{
          width: '100%',
          padding: '1rem',
          fontSize: '1.25rem',
          border: 'none',
          borderRadius: '4px',
          background: '#007bff',
          color: '#fff',
          cursor: 'pointer'
        }}>
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
