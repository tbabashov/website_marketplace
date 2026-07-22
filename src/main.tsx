import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import './index.css';
import { initI18n } from './i18n';
import App from './App';

const root = document.getElementById('root');
if (!root) throw new Error('#root is missing from index.html');

// The active locale is fetched before the first render, so nothing ever paints
// with raw translation keys in it.
void initI18n().then(() => {
  createRoot(root).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
});
