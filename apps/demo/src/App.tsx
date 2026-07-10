import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { Play } from './pages/Play.tsx'
import { Cards } from './pages/Cards.tsx'
import { Simulate } from './pages/Simulate.tsx'
import { Rules } from './pages/Rules.tsx'
import { Audit } from './pages/Audit.tsx'
import { Appendix } from './pages/Appendix.tsx'

export function App() {
  const tab = ({ isActive }: { isActive: boolean }) =>
    `rounded px-3 py-1 text-sm ${isActive ? 'bg-raised text-goldbright' : 'text-dim hover:text-body'}`
  return (
    // phones: the document scrolls and the header scrolls away with it; desktop: fixed shell
    <div className="flex h-full flex-col max-lg:block max-lg:h-auto max-lg:min-h-full">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b hairline px-4 py-2.5">
        <span className="font-display text-lg font-bold tracking-wide text-parchment">
          ⚔ New Game <span className="ml-1 align-middle text-[10px] font-normal uppercase tracking-widest text-dim">static demo — no server, everything runs in your browser</span>
        </span>
        {/* six tabs outgrew a phone (451px vs 390): wrap instead of forcing the layout viewport
            wide — an overflowing nav stretched mobile Chrome's ICB and dragged the fixed dock
            off-viewport, breaking taps (playtest 001, mobile probe) */}
        <nav className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-1">
          <NavLink to="/play" className={tab}>Play</NavLink>
          <NavLink to="/cards" className={tab}>Cards</NavLink>
          <NavLink to="/simulate" className={tab}>Simulate</NavLink>
          <NavLink to="/rules" className={tab}>Rulebook</NavLink>
          <NavLink to="/audit" className={tab}>Design Audit</NavLink>
          <NavLink to="/appendix" className={tab}>Appendix</NavLink>
        </nav>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto max-lg:overflow-visible">
        <Routes>
          <Route path="/" element={<Navigate to="/play" replace />} />
          <Route path="/play" element={<Play />} />
          <Route path="/cards" element={<Cards />} />
          <Route path="/simulate" element={<Simulate />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/appendix" element={<Appendix />} />
          <Route path="*" element={<Navigate to="/play" replace />} />
        </Routes>
      </main>
    </div>
  )
}
