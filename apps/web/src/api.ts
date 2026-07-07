/** Thin fetch wrapper: same-origin API, JSON in/out, throws Error(message) on non-2xx. */
export async function api<T = unknown>(path: string, options: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = options
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: json !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: json !== undefined ? JSON.stringify(json) : undefined,
    ...rest,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `${res.status} ${res.statusText}`)
  return body as T
}

export const get = <T,>(path: string) => api<T>(path)
export const post = <T,>(path: string, json?: unknown) => api<T>(path, { method: 'POST', json })
export const patch = <T,>(path: string, json?: unknown) => api<T>(path, { method: 'PATCH', json })
export const del = <T,>(path: string) => api<T>(path, { method: 'DELETE' })
