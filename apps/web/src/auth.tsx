import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { get, post } from './api.ts'

export interface User { id: string; username: string; isAdmin: boolean }

interface AuthCtx {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const Ctx = createContext<AuthCtx>(null as never)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    get<{ user: User }>('/api/auth/me')
      .then(r => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const value: AuthCtx = {
    user,
    loading,
    login: async (username, password) => {
      const r = await post<{ user: User }>('/api/auth/login', { username, password })
      setUser(r.user)
    },
    register: async (username, password) => {
      const r = await post<{ user: User }>('/api/auth/register', { username, password })
      setUser(r.user)
    },
    logout: async () => {
      await post('/api/auth/logout')
      setUser(null)
    },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function RequireAuth({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="grid h-full place-items-center text-dim">Consulting the archives…</div>
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (admin && !user.isAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}
