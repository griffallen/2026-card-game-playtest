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

/** Overextend printed on an action/upgrade: shift Influence N toward your opponent (DECISIONS ⚑14). */
export const overextend = (n: number): Op => ({ op: 'influence', n: -n })
/** The "Influence: +N" static line: controller gains N when the card enters play (DECISIONS ⚑15). */
export const influence = (n: number): Op => ({ op: 'influence', n })

export const toSet = (cards: CardDef[]) => Object.fromEntries(cards.map(c => [c.slug, c]))
