export interface TokenStore {
  getToken: () => string
  setToken: (token: string) => void
}

export function createTokenStore(initial: string): TokenStore {
  let current = initial
  return {
    getToken: () => current,
    setToken: (token: string) => {
      current = token
    }
  }
}
