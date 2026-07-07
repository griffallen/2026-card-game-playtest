import { useEffect, useState } from 'react'
import { del, get, patch } from '../../api.ts'
import { useAuth } from '../../auth.tsx'

interface Row { id: string; username: string; isAdmin: boolean; createdAt: string }

export function AdminUsers() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState<Row[]>([])
  const [error, setError] = useState('')
  const refresh = () => get<{ users: Row[] }>('/api/admin/users').then(r => setUsers(r.users)).catch(e => setError(e.message))
  useEffect(() => { refresh() }, [])

  const act = (p: Promise<unknown>) => p.then(refresh).catch(e => setError(e.message))

  return (
    <div className="panel overflow-hidden">
      {error && <p className="border-b hairline px-4 py-2 text-sm text-[#e5a99f]">{error}</p>}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b hairline text-left text-xs uppercase tracking-wider text-dim">
            <th className="px-4 py-2">Name</th><th className="px-4 py-2">Role</th><th className="px-4 py-2">Joined</th><th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} className="border-b hairline last:border-0">
              <td className="px-4 py-2 font-display text-parchment">{u.username}{u.id === me?.id ? ' (you)' : ''}</td>
              <td className="px-4 py-2">{u.isAdmin ? <span className="text-goldbright">admin ✦</span> : <span className="text-dim">player</span>}</td>
              <td className="px-4 py-2 text-dim">{new Date(u.createdAt).toLocaleDateString()}</td>
              <td className="px-4 py-2 text-right">
                <div className="inline-flex gap-1.5">
                  {u.id !== me?.id && (
                    <button className="btn !px-2 !py-0.5 text-xs" onClick={() => act(patch(`/api/admin/users/${u.id}`, { isAdmin: !u.isAdmin }))}>
                      {u.isAdmin ? 'demote' : 'make admin'}
                    </button>
                  )}
                  <button
                    className="btn !px-2 !py-0.5 text-xs"
                    onClick={() => {
                      const pw = prompt(`New passphrase for ${u.username} (min 8 chars):`)
                      if (pw) act(patch(`/api/admin/users/${u.id}`, { newPassword: pw }))
                    }}
                  >reset pw</button>
                  {u.id !== me?.id && (
                    <button className="btn btn-danger !px-2 !py-0.5 text-xs"
                      onClick={() => confirm(`Delete ${u.username}?`) && act(del(`/api/admin/users/${u.id}`))}>delete</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
