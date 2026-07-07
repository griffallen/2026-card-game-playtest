import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.tsx'

export function Login({ register = false }: { register?: boolean }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (register && password !== confirm) return setError('passwords do not match')
    setBusy(true)
    try {
      await (register ? auth.register(username, password) : auth.login(username, password))
      navigate((location.state as { from?: string })?.from ?? '/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid h-full place-items-center p-4">
      <form onSubmit={submit} className="panel w-full max-w-sm p-6">
        <h1 className="font-display text-2xl font-bold text-parchment">⚔ New Game</h1>
        <p className="mt-1 text-sm text-dim">{register ? 'Claim your name at the table.' : 'The table awaits.'}</p>
        <label className="mt-5 block text-xs uppercase tracking-wider text-dim">Name</label>
        <input className="input mt-1" autoFocus value={username} onChange={e => setUsername(e.target.value)}
          autoComplete="username" placeholder="lowercase, 3–24 chars" />
        <label className="mt-3 block text-xs uppercase tracking-wider text-dim">Passphrase</label>
        <input className="input mt-1" type="password" value={password} onChange={e => setPassword(e.target.value)}
          autoComplete={register ? 'new-password' : 'current-password'} placeholder="at least 8 characters" />
        {register && (
          <>
            <label className="mt-3 block text-xs uppercase tracking-wider text-dim">Confirm</label>
            <input className="input mt-1" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" />
          </>
        )}
        {error && <p className="mt-3 text-sm text-[#e5a99f]">{error}</p>}
        <button className="btn btn-primary mt-5 w-full" disabled={busy || !username || !password}>
          {busy ? '…' : register ? 'Join the game' : 'Enter'}
        </button>
        <p className="mt-4 text-center text-sm text-dim">
          {register
            ? <>Already seated? <Link className="text-goldbright" to="/login">Sign in</Link></>
            : <>First time? <Link className="text-goldbright" to="/register">Create an account</Link></>}
        </p>
      </form>
    </div>
  )
}
