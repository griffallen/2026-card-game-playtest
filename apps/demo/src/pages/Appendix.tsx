import { useMemo, useState, type ReactNode } from 'react'
import decisions from '@docs/DESIGN/DECISIONS.md?raw'
import genesys from '@docs/DESIGN/01-GENESYS.md?raw'
import gameFlow from '@docs/GAME-FLOW.md?raw'
import rulesSpec from '@docs/SPECS/game-rules.md?raw'
import colors from '@docs/DESIGN/04-COLORS-ROADMAP.md?raw'
import playtests from '@docs/PLAYTESTS.md?raw'
import uxAudit from '@docs/UX-AUDIT.md?raw'

const DOCS = [
  { key: 'decisions', title: 'Design Decisions', blurb: 'Every ruling made so far and the reasoning behind it — the canonical record.', src: decisions },
  { key: 'genesys', title: 'The Creative Brief', blurb: 'The original vision: what this game is trying to be.', src: genesys },
  { key: 'flow', title: 'How the Game Plays', blurb: "The designer's walkthrough, with the ⚑ judgment calls called out.", src: gameFlow },
  { key: 'colors', title: 'Colors Roadmap', blurb: 'Dreaming ahead — Green, Blue, and Purple factions.', src: colors },
  { key: 'playtests', title: 'Playtest Log', blurb: 'What real games at the table taught us.', src: playtests },
  { key: 'ux', title: 'UX Audit', blurb: 'The "can a player always tell what’s happening?" pass.', src: uxAudit },
  { key: 'spec', title: 'Full Rules Spec', blurb: 'The technical contract the engine implements (v2.0-proto).', src: rulesSpec },
] as const

// ── minimal markdown → JSX (no dependency): headings, lists, tables, code, hr, inline ──
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*\n]+\*|_[^_\n]+_)/g
  let last = 0, m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const t = m[0]
    if (t.startsWith('**')) out.push(<b key={out.length} className="text-parchment">{t.slice(2, -2)}</b>)
    else if (t.startsWith('`')) out.push(<code key={out.length} className="rounded bg-black/30 px-1 text-goldbright">{t.slice(1, -1)}</code>)
    else if (t.startsWith('[')) { const l = /\[([^\]]+)\]\(([^)]+)\)/.exec(t)!; out.push(<a key={out.length} href={l[2]} className="text-goldbright underline">{l[1]}</a>) }
    else out.push(<i key={out.length}>{t.slice(1, -1)}</i>)
    last = m.index + t.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

function render(src: string): ReactNode[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let i = 0, k = 0
  const cell = (l: string) => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i++; continue }
    const h = /^(#{1,4})\s+(.*)$/.exec(line)
    if (h) {
      const lvl = h[1].length
      const cls = lvl === 1 ? 'mt-8 text-3xl' : lvl === 2 ? 'mt-8 border-b hairline pb-1.5 text-2xl' : lvl === 3 ? 'mt-5 text-lg text-goldbright' : 'mt-4 text-base text-goldbright'
      blocks.push(<div key={k++} className={`scroll-mt-4 font-display font-bold text-parchment ${cls}`}>{inline(h[2])}</div>)
      i++; continue
    }
    if (/^(-{3,}|={3,}|\*{3,})$/.test(line.trim())) { blocks.push(<hr key={k++} className="my-6 hairline border-t" />); i++; continue }
    if (line.trim().startsWith('```')) {
      i++; const code: string[] = []
      while (i < lines.length && !lines[i].trim().startsWith('```')) { code.push(lines[i]); i++ }
      i++
      blocks.push(<pre key={k++} className="mt-3 overflow-x-auto rounded bg-black/30 p-3 font-mono text-[12.5px] leading-relaxed text-body/90">{code.join('\n')}</pre>)
      continue
    }
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]*-[\s:|-]*\|/.test(lines[i + 1])) {
      const header = cell(line); i += 2
      const rows: string[][] = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) { rows.push(cell(lines[i])); i++ }
      blocks.push(
        <div key={k++} className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr>{header.map((c, ci) => <th key={ci} className="border-b hairline px-2 py-1.5 text-left font-semibold text-goldbright">{inline(c)}</th>)}</tr></thead>
            <tbody>{rows.map((r, ri) => <tr key={ri} className="border-t hairline align-top">{r.map((c, ci) => <td key={ci} className="px-2 py-1.5 text-body/90">{inline(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      )
      continue
    }
    if (/^>\s?/.test(line)) {
      const q: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) { q.push(lines[i].replace(/^>\s?/, '')); i++ }
      blocks.push(<blockquote key={k++} className="mt-3 border-l-2 hairline pl-3 italic text-body/80">{inline(q.join(' '))}</blockquote>)
      continue
    }
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const numbered = /^\s*\d+\.\s+/.test(line)
      const items: ReactNode[] = []
      while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
        items.push(<li key={items.length} className="mt-1.5 leading-relaxed">{inline(lines[i].replace(/^\s*([-*+]|\d+\.)\s+/, ''))}</li>)
        i++
      }
      blocks.push(numbered
        ? <ol key={k++} className="ml-5 mt-2 list-decimal text-body/90">{items}</ol>
        : <ul key={k++} className="ml-5 mt-2 list-disc text-body/90">{items}</ul>)
      continue
    }
    const para: string[] = []
    while (i < lines.length && lines[i].trim()
      && !/^(#{1,4}\s|>|\s*([-*+]|\d+\.)\s|```)/.test(lines[i])
      && !/^(-{3,}|={3,})$/.test(lines[i].trim())
      && !(lines[i].includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]*-[\s:|-]*\|/.test(lines[i + 1]))) {
      para.push(lines[i]); i++
    }
    blocks.push(<p key={k++} className="mt-3 leading-relaxed text-body/90">{inline(para.join(' '))}</p>)
  }
  return blocks
}

export function Appendix() {
  const [active, setActive] = useState<string>('decisions')
  const doc = DOCS.find(d => d.key === active) ?? DOCS[0]
  const body = useMemo(() => render(doc.src), [doc.src])
  return (
    <div className="mx-auto max-w-3xl px-6 pb-24 pt-10 text-[15px]">
      <p className="text-xs uppercase tracking-[0.2em] text-dim">New Game · Appendix · v2.0 · 2026-07-08</p>
      <h1 className="mt-2 font-display text-4xl font-bold text-parchment">Design Lore &amp; Documents</h1>
      <p className="mt-3 leading-relaxed text-body/90">
        The working papers behind the game — bundled straight from the project so you can read them here. Start with
        the <b className="text-parchment">Design Decisions</b>: every ruling and why it was made.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {DOCS.map(d => (
          <button
            key={d.key}
            onClick={() => setActive(d.key)}
            className={`rounded-full border px-3 py-1 text-[13px] transition-colors ${
              d.key === active ? 'border-goldbright/60 bg-raised text-goldbright' : 'hairline text-dim hover:text-body'
            }`}
          >{d.title}</button>
        ))}
      </div>

      <p className="mt-4 text-sm italic text-dim">{doc.blurb}</p>
      <hr className="mt-2 hairline border-t" />

      <article className="mt-2">{body}</article>
    </div>
  )
}
