import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameAction, PlayerView } from '@newgame/engine'

export interface GameMeta { names: [string, string]; status: string; gameName: string }
export interface Toast { id: number; kind: 'error' | 'info'; msg: string }

interface Frame {
  t: string
  view?: PlayerView
  seq?: number
  meta?: GameMeta
  online?: [boolean, boolean]
  spectators?: number
  msg?: string
  by?: string
  winnerSeat?: number
  reason?: string
}

export function useGameSocket(gameId: string) {
  const [view, setView] = useState<PlayerView | null>(null)
  const [meta, setMeta] = useState<GameMeta | null>(null)
  const [online, setOnline] = useState<[boolean, boolean]>([false, false])
  const [spectators, setSpectators] = useState(0)
  const [connected, setConnected] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const closedByUs = useRef(false)
  const attempts = useRef(0)
  const toastId = useRef(0)

  const toast = useCallback((kind: Toast['kind'], msg: string) => {
    const id = ++toastId.current
    setToasts(ts => [...ts.slice(-3), { id, kind, msg }])
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 4500)
  }, [])

  useEffect(() => {
    closedByUs.current = false
    let pingTimer: ReturnType<typeof setInterval> | undefined
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined

    function connect() {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws'
      const ws = new WebSocket(`${proto}://${location.host}/ws?gameId=${gameId}`)
      wsRef.current = ws
      ws.onopen = () => {
        setConnected(true)
        attempts.current = 0
        pingTimer = setInterval(() => ws.readyState === ws.OPEN && ws.send(JSON.stringify({ t: 'ping' })), 25_000)
      }
      ws.onmessage = ev => {
        const frame = JSON.parse(String(ev.data)) as Frame
        if (frame.t === 'state' && frame.view) {
          setView(frame.view)
          if (frame.meta) setMeta(frame.meta)
        } else if (frame.t === 'presence') {
          if (frame.online) setOnline(frame.online)
          setSpectators(frame.spectators ?? 0)
        } else if (frame.t === 'error') {
          toast('error', frame.msg ?? 'that was not allowed')
        } else if (frame.t === 'undone') {
          toast('info', `${frame.by} undid the last action`)
        }
      }
      ws.onclose = () => {
        setConnected(false)
        clearInterval(pingTimer)
        if (!closedByUs.current) {
          const delay = Math.min(1000 * 2 ** attempts.current++, 8000)
          reconnectTimer = setTimeout(connect, delay)
        }
      }
    }
    connect()
    return () => {
      closedByUs.current = true
      clearInterval(pingTimer)
      clearTimeout(reconnectTimer)
      wsRef.current?.close()
    }
  }, [gameId, toast])

  const sendAction = useCallback((action: GameAction) => {
    wsRef.current?.send(JSON.stringify({ t: 'action', action }))
  }, [])
  const undo = useCallback(() => { wsRef.current?.send(JSON.stringify({ t: 'undo' })) }, [])

  return { view, meta, online, spectators, connected, toasts, sendAction, undo }
}
