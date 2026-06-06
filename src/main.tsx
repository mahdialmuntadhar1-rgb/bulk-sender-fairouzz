import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import GovernorateBulkSenderApp from './GovernorateBulkSenderApp.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GovernorateBulkSenderApp />
  </StrictMode>,
);
