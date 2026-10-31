import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import {BrowserRouter as Router} from 'react-router';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>
);
