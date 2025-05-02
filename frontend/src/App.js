import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

function App() {
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    const socket = io('http://localhost:3000');

    socket.on('connect', () =>
      console.log('socket connected', socket.id)
    );

    socket.on('alert', msg => {
      console.log('alert event received:', msg);
      setAlertMessage(msg);
      setTimeout(() => setAlertMessage(''), 5000);
    });

    socket.on('connect_error', err =>
      console.error('socket connection error:', err)
    );

    return () => socket.disconnect();
  }, []);

  return (
    <div>
      {/* Manual test button */}
      <button
        onClick={() => setAlertMessage('Manual test banner')}
        style={{ margin: '1rem' }}
      >
        Show Test Banner
      </button>

      {/* The banner */}
      {alertMessage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            background: '#fffae6',
            borderBottom: '1px solid #f5c518',
            padding: '0.75rem',
            textAlign: 'center',
            fontWeight: 'bold',
            zIndex: 1000,
          }}
        >
          {alertMessage}
        </div>
      )}

      {/* Rest of your app would go here */}
      <div style={{ marginTop: alertMessage ? '3rem' : 0 }}>
        {/* ... */}
        <p>Your app content</p>
      </div>
    </div>
  );
}

export default App;
