/* Custom decks for the demo (issue #30): the designer edits card counts in the browser,
   persisted in localStorage, playable alongside the prebuilts. No server involved. */
import { PREBUILT_DECKS, type PrebuiltDeck } from '@newgame/engine'

export interface CustomDeck extends Omit<PrebuiltDeck, 'color'> {
  color: PrebuiltDeck['color'] | 'custom'
  custom: true
}

const KEY = 'ng-custom-decks'

export function loadCustomDecks(): CustomDeck[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]') as CustomDeck[]
    return Array.isArray(raw) ? raw.filter(d => d && d.slug && Array.isArray(d.cards)) : []
  } catch {
    return []
  }
}

export function saveCustomDeck(deck: CustomDeck) {
  const decks = loadCustomDecks().filter(d => d.slug !== deck.slug)
  decks.push(deck)
  localStorage.setItem(KEY, JSON.stringify(decks))
}

export function deleteCustomDeck(slug: string) {
  localStorage.setItem(KEY, JSON.stringify(loadCustomDecks().filter(d => d.slug !== slug)))
}

export const customSlugFor = (name: string) =>
  'custom-' + name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

/** Prebuilts plus the browser's own creations — the one list every deck picker should use. */
export function allDecks(): (PrebuiltDeck | CustomDeck)[] {
  return [...PREBUILT_DECKS, ...loadCustomDecks()]
}
