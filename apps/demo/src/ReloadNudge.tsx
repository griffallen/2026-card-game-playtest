import { useEffect, useState } from 'react'

declare const __ART_VER__: string

// #115 (Blaine): cache-busting (content-hashed bundles, SHA-stamped art) never reaches an
// already-open SPA tab — it keeps running the JS it first painted. That's how Griff played a
// stale build for days, which starved the corpus. This is the runtime version check: the build
// SHA is baked in via __ART_VER__ (the same define that stamps art URLs), deploy-demo.sh drops a
// tiny version.json alongside the bundle, and we re-fetch it on focus / visibility. If the served
// build differs from the baked one, we NUDGE — a dismissable pill, never a forced reload mid-game.
export function ReloadNudge() {
  const [stale, setStale] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let live = true
    const check = async () => {
      try {
        const res = await fetch('version.json', { cache: 'no-store' })
        if (!res.ok) return
        const { build } = await res.json()
        if (live && build && build !== __ART_VER__) setStale(true)
      } catch {
        // dev has no version.json (404) and a network blip is harmless — the next
        // focus/visibility check tries again. Never surface fetch errors to the player.
      }
    }
    check()
    const onVisible = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', check)
    return () => {
      live = false
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', check)
    }
  }, [])

  if (!stale || dismissed) return null
  return (
    <div className="fixed inset-x-0 bottom-4 z-[100] flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-full border hairline bg-raised px-4 py-2 text-sm text-body shadow-xl">
        <span>A new build is live.</span>
        <button
          onClick={() => location.reload()}
          className="rounded-full bg-goldbright/20 px-3 py-1 font-medium text-goldbright hover:bg-goldbright/30">
          Reload
        </button>
        <button onClick={() => setDismissed(true)} aria-label="Dismiss" className="text-dim hover:text-body">✕</button>
      </div>
    </div>
  )
}
