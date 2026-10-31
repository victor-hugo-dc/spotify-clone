import React from 'react';
import { createRoot } from 'react-dom/client';
// First, so the frame's and each area's own stylesheets (imported by their components) come after it.
import './index.css';
import App from './App';
import {BrowserRouter as Router} from 'react-router';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>
);
