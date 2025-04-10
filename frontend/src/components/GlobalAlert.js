// src/components/GlobalAlert.js
import React, { useEffect } from 'react';
import io from 'socket.io-client';

// Connect to your server's WebSocket endpoint. Adjust the URL as needed.
const socket = io('http://yourserver.com:3000');

function GlobalAlert() {
  useEffect(() => {
    // Listen for an "alert" event.
    socket.on('alert', (message) => {
      // Directly trigger the browser's native alert dialog.
      window.alert(message);
    });

    // Clean up the listener on unmount.
    return () => {
      socket.off('alert');
    };
  }, []);

  // This component doesn't render anything visible.
  return null;
}

export default GlobalAlert;
