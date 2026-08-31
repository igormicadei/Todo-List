import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { loadApiConfig } from './api/config'
import './styles/app.scss'

function renderError(message: string): void {
  const root = document.getElementById('root')
  if (root) {
    root.innerHTML = `<pre style="padding:24px;color:#da1e28;white-space:pre-wrap;">Failed to load app config:\n${message}</pre>`
  }
}

loadApiConfig()
  .then(() => {
    ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
  })
  .catch((error: unknown) => {
    renderError(error instanceof Error ? error.message : String(error))
  })
