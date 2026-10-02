const baseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

// Central boundary for the future FastAPI service. Mock services can be swapped for these calls without changing pages.
export const apiClient = {
  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`)
    if (!response.ok) throw new Error(`Request failed (${response.status})`)
    return response.json() as Promise<T>
  },
  async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!response.ok) throw new Error(`Request failed (${response.status})`)
    return response.json() as Promise<T>
  },
}
