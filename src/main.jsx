import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import Admin from './Admin.jsx';
import './styles.css';

const isAdmin = () => location.hash.startsWith('#/admin');

const Root = () => {
  const [adminMode, setAdminMode] = useState(isAdmin);

  useEffect(() => {
    const handleHash = () => setAdminMode(isAdmin());
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  return adminMode ? <Admin /> : <App />;
};

createRoot(document.getElementById('root')).render(<Root />);
