import type { CardDef, Color, Op } from '../types.ts'

export const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

type Extra = Partial<Omit<CardDef, 'slug' | 'name' | 'color' | 'type' | 'cost' | 'power' | 'health'>>

export function makeBuilders(color: Color) {
  const base = (name: string, type: CardDef['type'], cost: number, extra: Extra): CardDef => {
    const slug = slugify(name)
    return { slug, name, color, type, cost, text: '', artUrl: `/cards/${slug}.jpg`, ...extra }
  }
  return {
    unit: (cost: number, name: string, power: number, health: number, extra: Extra = {}): CardDef =>
      ({ ...base(name, 'unit', cost, extra), power, health }),
    action: (cost: number, name: string, extra: Extra = {}): CardDef => base(name, 'action', cost, extra),
    upgrade: (cost: number, name: string, extra: Extra = {}): CardDef => base(name, 'upgrade', cost, extra),
  }
}

/** Influence ops are always event-earned (decision 34): attach to onDefend/onKill/onPlay per card. */
export const influence = (n: number): Op => ({ op: 'influence', n })

export const toSet = (cards: CardDef[]) => Object.fromEntries(cards.map(c => [c.slug, c]))
