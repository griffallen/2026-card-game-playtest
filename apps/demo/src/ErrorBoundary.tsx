import { Component, type ErrorInfo, type ReactNode } from 'react'

// #90 (Griff): a demo game could throw during render and the WHOLE screen went black — a
// bare React tree has no net, so one bad render unmounts everything and a refresh loses the
// game (state isn't persisted). This catches render/lifecycle throws, keeps the shell alive,
// and — crucially — SHOWS the error so Griff can paste it into #90 and we can pin the exact
// line. "Try to continue" resets the boundary (recovers if the bad render was transient).
interface State { error: Error | null; info: ErrorInfo | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, info: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[demo crash — #90]', error, info.componentStack)
    this.setState({ info })
  }

  render() {
    const { error, info } = this.state
    if (!error) return this.props.children
    const detail = `${error.message}\n\n${error.stack ?? ''}\n\ncomponent stack:${info?.componentStack ?? ''}`
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-lg border border-[#b23a2c]/60 bg-[#b23a2c]/10 p-4">
          <h2 className="font-display text-lg font-bold text-[#e5a99f]">Something glitched this turn</h2>
          <p className="mt-1 text-sm text-body">
            The demo hit an unexpected error — but it no longer takes the whole screen down with it.
            If you can, <b>copy the red text below into issue #90</b> so the Chronicler can pin the exact cause.
          </p>
          <pre className="mt-3 max-h-64 overflow-auto rounded bg-black/40 p-3 text-[11px] leading-relaxed text-[#e5a99f] whitespace-pre-wrap">{detail}</pre>
          <div className="mt-3 flex gap-2">
            <button className="btn btn-primary !py-1 text-sm" onClick={() => location.reload()}>
              Start a new game
            </button>
            <button className="btn !py-1 text-sm" onClick={() => this.setState({ error: null, info: null })}>
              Try to continue
            </button>
          </div>
        </div>
      </div>
    )
  }
}
