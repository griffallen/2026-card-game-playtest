import { useEffect, useRef, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Play } from './pages/Play.tsx'
import { Cards } from './pages/Cards.tsx'
import { DeckBuilder } from './pages/DeckBuilder.tsx'
import { Simulate } from './pages/Simulate.tsx'
import { Rules } from './pages/Rules.tsx'
import { Audit } from './pages/Audit.tsx'
import { Appendix } from './pages/Appendix.tsx'
import { ErrorBoundary } from './ErrorBoundary.tsx'
import { ReloadNudge } from './ReloadNudge.tsx'

/* The design docs live under one "Archive" sub-menu so the nav stays lean (session 010).
   The Rulebook stays top-level — it teaches the game; these document its making. */
const ARCHIVE = [
  { to: '/audit', label: 'Design Audit', blurb: 'the current state of the realm' },
  { to: '/appendix', label: 'Appendix', blurb: 'the dry ledgers in full' },
] as const

function ArchiveMenu({ tab }: { tab: (a: { isActive: boolean }) => string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const loc = useLocation()
  const active = ARCHIVE.some(a => loc.pathname.startsWith(a.to))
  useEffect(() => setOpen(false), [loc.pathname])   // navigating closes the menu
  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [open])
  return (
    <div ref={ref} className="relative">
      <button className={tab({ isActive: active })} onClick={() => setOpen(o => !o)} aria-expanded={open}>
        Archive <span className="text-[9px]">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-lg border hairline bg-raised p-1 shadow-xl">
          {ARCHIVE.map(a => (
            <NavLink key={a.to} to={a.to}
              className={({ isActive }) => `block rounded px-3 py-1.5 text-sm ${isActive ? 'text-goldbright' : 'text-body hover:text-goldbright'}`}>
              {a.label}
              <span className="block text-[10.5px] italic text-dim">{a.blurb}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export function App() {
  const tab = ({ isActive }: { isActive: boolean }) =>
    `rounded px-3 py-1 text-sm ${isActive ? 'bg-raised text-goldbright' : 'text-dim hover:text-body'}`
  return (
    // phones: the document scrolls and the header scrolls away with it; desktop: fixed shell
    <div className="flex h-full flex-col max-lg:block max-lg:h-auto max-lg:min-h-full">
      <ReloadNudge />
      <header className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b hairline px-4 py-2.5">
        <span className="font-display text-lg font-bold tracking-wide text-parchment">
          ⚔ New Game <span className="ml-1 align-middle text-[10px] font-normal uppercase tracking-widest text-dim">static demo — no server, everything runs in your browser</span>
        </span>
        {/* six tabs outgrew a phone (451px vs 390): wrap instead of forcing the layout viewport
            wide — an overflowing nav stretched mobile Chrome's ICB and dragged the fixed dock
            off-viewport, breaking taps (playtest 001, mobile probe) */}
        <nav className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-1">
          <NavLink to="/play" className={tab}>Play</NavLink>
          <NavLink to="/decks" className={tab}>Decks</NavLink>
          <NavLink to="/cards" className={tab}>Cards</NavLink>
          <NavLink to="/simulate" className={tab}>Simulate</NavLink>
          <NavLink to="/rules" className={tab}>Rulebook</NavLink>
          <ArchiveMenu tab={tab} />
        </nav>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto max-lg:overflow-visible">
        <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Navigate to="/play" replace />} />
          <Route path="/play" element={<Play />} />
          <Route path="/decks" element={<DeckBuilder />} />
          <Route path="/cards" element={<Cards />} />
          <Route path="/simulate" element={<Simulate />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/appendix" element={<Appendix />} />
          <Route path="*" element={<Navigate to="/play" replace />} />
        </Routes>
        </ErrorBoundary>
      </main>
    </div>
  )
}
