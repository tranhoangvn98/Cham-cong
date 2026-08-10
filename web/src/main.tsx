import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import './kieu.css';

const goc = document.getElementById('goc');
if (goc === null) throw new Error('Khong tim thay the #goc trong index.html');

createRoot(goc).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
