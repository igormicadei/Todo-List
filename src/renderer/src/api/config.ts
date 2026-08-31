export interface ApiConfig {
  apiBaseUrl: string
  apiToken: string
}

let cached: ApiConfig | null = null

export async function loadApiConfig(): Promise<ApiConfig> {
  if (cached) return cached

  if (window.electronAPI) {
    cached = await window.electronAPI.getConfig()
    return cached
  }

  // Fallback for running the renderer standalone (outside Electron), e.g. under
  // Playwright verification: point it at an already-running embedded server.
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
  const apiToken = import.meta.env.VITE_API_TOKEN
  if (!apiBaseUrl || !apiToken) {
    throw new Error(
      'No window.electronAPI bridge found, and VITE_API_BASE_URL/VITE_API_TOKEN are not set as a fallback.'
    )
  }
  cached = { apiBaseUrl, apiToken }
  return cached
}

export function getApiConfig(): ApiConfig {
  if (!cached) {
    throw new Error('API config not loaded yet — call loadApiConfig() before rendering the app.')
  }
  return cached
}
