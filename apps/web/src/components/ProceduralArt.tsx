import { useMemo } from 'react'

/**
 * Deterministic card art from a slug — every new card gets stable, unique
 * imagery with zero external services (DECISIONS: procedural art for admin-created cards).
 * Layered seeded geometry: banded sky, a central sigil, orbiting motes.
 */

function hash32(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry(seed: number) {
  let s = seed
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const PALETTES: Record<string, { sky: [string, string]; ground: string; sigil: string; glow: string; mote: string }> = {
  red: { sky: ['#2a0f0a', '#571f12'], ground: '#1c0c07', sigil: '#e2583e', glow: '#ff9a5e', mote: '#f4c04a' },
  yellow: { sky: ['#2a220c', '#5d4a14'], ground: '#1d1708', sigil: '#e8c14a', glow: '#fff0b0', mote: '#f7e08a' },
  neutral: { sky: ['#1c1c22', '#3c3d4d'], ground: '#131318', sigil: '#9aa3c0', glow: '#dfe6ff', mote: '#c9d0e8' },
}

const TAU = Math.PI * 2

export function ProceduralArt({ slug, color, type, className }: {
  slug: string
  color: string
  type: string
  className?: string
}) {
  const svg = useMemo(() => {
    const rng = mulberry(hash32(`${slug}|${color}|${type}`))
    const p = PALETTES[color] ?? PALETTES.neutral
    const W = 280
    const H = 168
    const cx = W / 2 + (rng() - 0.5) * 40
    const cy = H / 2 + (rng() - 0.5) * 20

    // sigil: unit = angular star/blade, action = radiant burst, upgrade = concentric ring
    const points = 3 + Math.floor(rng() * 5)
    const r1 = 34 + rng() * 22
    const r2 = r1 * (0.38 + rng() * 0.25)
    const rot = rng() * TAU
    let sigil = ''
    if (type === 'upgrade') {
      sigil = `<circle cx="${cx}" cy="${cy}" r="${r1}" fill="none" stroke="${p.sigil}" stroke-width="6" opacity="0.9"/>
        <circle cx="${cx}" cy="${cy}" r="${r2}" fill="none" stroke="${p.glow}" stroke-width="2.5" opacity="0.8"/>`
    } else {
      const spikes = type === 'action' ? points + 4 : points + 2
      const pts: string[] = []
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? r1 : r2
        const a = rot + (i / (spikes * 2)) * TAU
        pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`)
      }
      sigil = `<polygon points="${pts.join(' ')}" fill="${p.sigil}" opacity="0.92" stroke="${p.glow}" stroke-width="1.5"/>`
    }

    let motes = ''
    const n = 6 + Math.floor(rng() * 7)
    for (let i = 0; i < n; i++) {
      motes += `<circle cx="${(rng() * W).toFixed(1)}" cy="${(rng() * H).toFixed(1)}" r="${(0.8 + rng() * 2.2).toFixed(1)}" fill="${p.mote}" opacity="${(0.25 + rng() * 0.5).toFixed(2)}"/>`
    }

    const ridges: string[] = []
    for (let i = 0; i < 3; i++) {
      const y = H * (0.62 + i * 0.13) + rng() * 8
      const bulge = 10 + rng() * 26
      ridges.push(`<path d="M0 ${y} Q ${W * (0.2 + rng() * 0.6)} ${y - bulge} ${W} ${y} V ${H} H 0 Z" fill="${p.ground}" opacity="${0.55 + i * 0.2}"/>`)
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sky-${slug}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${p.sky[0]}"/><stop offset="1" stop-color="${p.sky[1]}"/>
        </linearGradient>
        <radialGradient id="halo-${slug}" cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stop-color="${p.glow}" stop-opacity="0.5"/><stop offset="1" stop-color="${p.glow}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#sky-${slug})"/>
      <rect width="${W}" height="${H}" fill="url(#halo-${slug})"/>
      ${ridges.join('')}
      ${sigil}
      ${motes}
    </svg>`
  }, [slug, color, type])

  return <div className={className} dangerouslySetInnerHTML={{ __html: svg }} />
}
