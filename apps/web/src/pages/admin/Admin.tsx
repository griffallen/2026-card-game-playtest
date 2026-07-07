import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { AdminUsers } from './Users.tsx'
import { AdminGames } from './Games.tsx'
import { AdminCards } from './Cards.tsx'
import { AdminDecks } from './Decks.tsx'
import { AdminRules } from './Rules.tsx'

export function Admin() {
  const tab = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-1.5 text-sm ${isActive ? 'bg-raised text-goldbright' : 'text-dim hover:text-body'}`
  return (
    <div className="mx-auto max-w-6xl p-4">
      <h1 className="font-display text-2xl font-bold text-parchment">The Admin Hall</h1>
      <nav className="mt-3 flex gap-1 border-b hairline pb-2">
        <NavLink to="users" className={tab}>Users</NavLink>
        <NavLink to="games" className={tab}>Games</NavLink>
        <NavLink to="cards" className={tab}>Cards</NavLink>
        <NavLink to="decks" className={tab}>Decks</NavLink>
        <NavLink to="rules" className={tab}>Rules</NavLink>
      </nav>
      <div className="mt-4">
        <Routes>
          <Route index element={<Navigate to="users" replace />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="games" element={<AdminGames />} />
          <Route path="cards" element={<AdminCards />} />
          <Route path="decks" element={<AdminDecks />} />
          <Route path="rules" element={<AdminRules />} />
        </Routes>
      </div>
    </div>
  )
}
