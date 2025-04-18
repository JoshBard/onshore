import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#333',
      padding: '10px'
    }}>
      <Link to="/" style={{ margin: '0 10px', textDecoration: 'none' }}>
        <button style={{ padding: '8px 16px', cursor: 'pointer' }}>Home</button>
      </Link>
      <Link to="/upload" style={{ margin: '0 10px', textDecoration: 'none' }}>
        <button style={{ padding: '8px 16px', cursor: 'pointer' }}>Upload Coordinates</button>
      </Link>
      <Link to="/map" style={{ margin: '0 10px', textDecoration: 'none' }}>
        <button style={{ padding: '8px 16px', cursor: 'pointer' }}>Select Coordinates</button>
      </Link>
      <Link to="/manual" style={{ margin: '0 10px', textDecoration: 'none' }}>
        <button style={{ padding: '8px 16px', cursor: 'pointer' }}>Manual Control Mode</button>
      </Link>
      <Link to="/wifi" style={{ margin: '0 10px', textDecoration: 'none' }}>
        <button style={{ padding: '8px 16px', cursor: 'pointer' }}>Change Network</button>
      </Link>
    </header>
  );
};

export default Header;
