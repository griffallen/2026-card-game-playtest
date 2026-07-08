import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { Play } from './pages/Play.tsx'
import { Simulate } from './pages/Simulate.tsx'
import { Audit } from './pages/Audit.tsx'

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
        <nav className="ml-auto flex items-center gap-1">
          <NavLink to="/play" className={tab}>Play</NavLink>
          <NavLink to="/simulate" className={tab}>Simulate</NavLink>
          <NavLink to="/audit" className={tab}>Design Audit</NavLink>
        </nav>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto max-lg:overflow-visible">
        <Routes>
          <Route path="/" element={<Navigate to="/play" replace />} />
          <Route path="/play" element={<Play />} />
          <Route path="/simulate" element={<Simulate />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="*" element={<Navigate to="/play" replace />} />
        </Routes>
      </main>
    </div>
  )
}
