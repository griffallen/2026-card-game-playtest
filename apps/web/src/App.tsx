import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { RequireAuth, useAuth } from './auth.tsx'
import { Login } from './pages/Login.tsx'
import { Lobby } from './pages/Lobby.tsx'
import { Decks } from './pages/Decks.tsx'
import { DeckDetail } from './pages/DeckDetail.tsx'
import { CardsBrowser } from './pages/CardsBrowser.tsx'
import { GameTable } from './pages/GameTable.tsx'
import { Admin } from './pages/admin/Admin.tsx'

function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const nav = ({ isActive }: { isActive: boolean }) =>
    `rounded px-2 py-1 text-sm ${isActive ? 'text-goldbright' : 'text-dim hover:text-body'}`
  return (
    <header className="flex items-center gap-4 border-b hairline px-4 py-2.5">
      <Link to="/" className="font-display text-lg font-bold tracking-wide text-parchment">
        ⚔ New Game <span className="ml-1 align-middle text-[10px] font-normal uppercase tracking-widest text-dim">prototype</span>
      </Link>
      <nav className="flex items-center gap-1">
        <NavLink to="/" end className={nav}>Tables</NavLink>
        <NavLink to="/decks" className={nav}>Decks</NavLink>
        <NavLink to="/cards" className={nav}>Cards</NavLink>
        {user?.isAdmin && <NavLink to="/admin" className={nav}>Admin</NavLink>}
      </nav>
      <div className="ml-auto flex items-center gap-3 text-sm">
        {user && (
          <>
            <span className="text-dim">{user.username}{user.isAdmin ? ' ✦' : ''}</span>
            <button className="btn !px-2 !py-1 text-xs" onClick={() => logout().then(() => navigate('/login'))}>Leave</button>
          </>
        )}
      </div>
    </header>
  )
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Login register />} />
      <Route
        path="/game/:id"
        element={<RequireAuth><GameTable /></RequireAuth>}
      />
      <Route
        path="*"
        element={
          <RequireAuth>
            <div className="flex h-full flex-col">
              <Header />
              <main className="min-h-0 flex-1 overflow-y-auto">
                <Routes>
                  <Route path="/" element={<Lobby />} />
                  <Route path="/decks" element={<Decks />} />
                  <Route path="/decks/:id" element={<DeckDetail />} />
                  <Route path="/cards" element={<CardsBrowser />} />
                  <Route path="/admin/*" element={<RequireAuth admin><Admin /></RequireAuth>} />
                  <Route path="*" element={<div className="p-8 text-dim">Lost in the mists. <Link className="text-goldbright" to="/">Return</Link></div>} />
                </Routes>
              </main>
            </div>
          </RequireAuth>
        }
      />
    </Routes>
  )
}
