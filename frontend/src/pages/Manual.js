import React, { useEffect } from 'react';
import { io } from 'socket.io-client';

// Adjust BASE_URL if needed
const BASE_URL = process.env.REACT_APP_RPI;
const socket = io(`${BASE_URL}`); // WebSocket connection to backend

const App = () => {
    useEffect(() => {
        const handleKeyDown = (event) => {
            let command = null;
            switch (event.key) {
                case 'w': command = 'FORWARD'; break;
                case 'a': command = 'LEFT'; break;
                case 's': command = 'BACKWARD'; break;
                case 'd': command = 'RIGHT'; break;
                default: return;
            }

            // Send command via WebSocket
            socket.emit('keypress', command);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    return (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <h1>Manual Control (WebSockets)</h1>
            <p>Press WASD to send commands in real time.</p>
        </div>
    );
};

export default App;
