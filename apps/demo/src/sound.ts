/* Lightweight synthesized table sounds (#27) — WebAudio only, no assets, defaults on
   with a persisted opt-out. Browsers gate audio behind a user gesture; every call site
   here follows a click, so the context resumes naturally. */
let ctx: AudioContext | null = null
let on = (localStorage.getItem('ng-sound') ?? 'on') === 'on'

export const soundOn = () => on
export function setSound(v: boolean) {
  on = v
  localStorage.setItem('ng-sound', v ? 'on' : 'off')
}

function ac(): AudioContext | null {
  if (!on) return null
  try { ctx ??= new AudioContext() } catch { return null }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, ms: number, type: OscillatorType, gain: number, delayMs = 0) {
  const c = ac()
  if (!c) return
  const o = c.createOscillator()
  const g = c.createGain()
  const t0 = c.currentTime + delayMs / 1000
  o.type = type
  o.frequency.setValueAtTime(freq, t0)
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000)
  o.connect(g).connect(c.destination)
  o.start(t0)
  o.stop(t0 + ms / 1000 + 0.05)
}

/** One vocabulary, five words: cards swish, blows thud, rounds chime, wins sing, refusals buzz. */
export function sfx(kind: 'play' | 'hit' | 'round' | 'win' | 'error') {
  switch (kind) {
    case 'play': tone(520, 90, 'triangle', 0.06); tone(700, 120, 'triangle', 0.05, 60); break
    case 'hit': tone(140, 160, 'square', 0.07); tone(90, 220, 'sine', 0.08, 20); break
    case 'round': tone(660, 300, 'sine', 0.05); tone(990, 420, 'sine', 0.04, 120); break
    case 'win': [523, 659, 784, 1047].forEach((f, i) => tone(f, 260, 'triangle', 0.06, i * 140)); break
    case 'error': tone(220, 140, 'sawtooth', 0.04); break
  }
}
