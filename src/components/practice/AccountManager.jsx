import { useState } from 'react'
import useStore from '../../store'

function fmt$(n) {
  return '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function AccountManager({ onClose }) {
  const namedAccounts      = useStore(s => s.namedAccounts)
  const activeAccountId    = useStore(s => s.activeAccountId)
  const createNamedAccount = useStore(s => s.createNamedAccount)
  const deleteNamedAccount = useStore(s => s.deleteNamedAccount)
  const renameNamedAccount = useStore(s => s.renameNamedAccount)
  const resetNamedAccount  = useStore(s => s.resetNamedAccount)
  const setActiveAccount   = useStore(s => s.setActiveAccount)

  const [newName,    setNewName]    = useState('')
  const [newType,    setNewType]    = useState('prop')
  const [newBalance, setNewBalance] = useState('50000')
  const [editingId,  setEditingId]  = useState(null)
  const [editName,   setEditName]   = useState('')

  function handleCreate() {
    const bal = parseFloat(newBalance)
    if (!newName.trim() || isNaN(bal) || bal <= 0) return
    createNamedAccount(newName.trim(), newType, bal)
    setNewName('')
    setNewBalance(newType === 'prop' ? '50000' : '10000')
  }

  function handleRename(id) {
    if (editName.trim()) renameNamedAccount(id, editName.trim())
    setEditingId(null)
    setEditName('')
  }

  const typeColor = { prop: '#4f8ef7', paper: '#a78bfa' }
  const isDefault = (id) => id === 'default-prop' || id === 'default-paper'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: '#0e1220', border: '1px solid #2a3a5a', borderRadius: 12,
        width: 440, maxHeight: '80vh', overflow: 'hidden auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderBottom: '1px solid #1a2340',
        }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Manage Accounts</div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--muted)',
            cursor: 'pointer', fontSize: 18, padding: '0 4px', lineHeight: 1,
          }}>×</button>
        </div>

        <div style={{ padding: '14px 18px' }}>
          {/* Account list */}
          {namedAccounts.map(acc => {
            const isActive = acc.id === activeAccountId
            const pnl      = acc.balance - acc.startingBalance
            return (
              <div
                key={acc.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 12px', borderRadius: 8, marginBottom: 6,
                  border: isActive ? '1px solid rgba(79,142,247,0.4)' : '1px solid var(--border)',
                  background: isActive ? 'rgba(79,142,247,0.07)' : 'var(--bg2)',
                  cursor: 'pointer',
                }}
                onClick={() => setActiveAccount(acc.id)}
              >
                {/* Active indicator */}
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: isActive ? '#4f8ef7' : 'var(--border)',
                }} />

                {/* Name + type */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingId === acc.id ? (
                    <input
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRename(acc.id)
                        if (e.key === 'Escape') { setEditingId(null) }
                      }}
                      onBlur={() => handleRename(acc.id)}
                      onClick={e => e.stopPropagation()}
                      style={{
                        background: 'var(--bg3)', border: '1px solid var(--accent)',
                        borderRadius: 4, padding: '2px 6px', color: 'var(--text)',
                        fontSize: 12, fontWeight: 700, fontFamily: 'inherit', width: '100%',
                      }}
                    />
                  ) : (
                    <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {acc.name}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: typeColor[acc.type] ?? 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: 1 }}>
                    {acc.type}
                  </div>
                </div>

                {/* Balance + P&L */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: 'var(--text)' }}>
                    {fmt$(acc.balance)}
                  </div>
                  <div style={{ fontSize: 10, fontFamily: 'monospace', color: pnl >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                    {pnl >= 0 ? '+' : ''}{fmt$(pnl)}
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  <button
                    title="Rename"
                    onClick={() => { setEditingId(acc.id); setEditName(acc.name) }}
                    style={iconBtnStyle}
                  >✎</button>
                  <button
                    title="Reset to starting balance"
                    onClick={() => { if (window.confirm(`Reset "${acc.name}" to ${fmt$(acc.startingBalance)}?`)) resetNamedAccount(acc.id) }}
                    style={iconBtnStyle}
                  >↺</button>
                  {!isDefault(acc.id) && (
                    <button
                      title="Delete account"
                      onClick={() => { if (window.confirm(`Delete "${acc.name}"?`)) deleteNamedAccount(acc.id) }}
                      style={{ ...iconBtnStyle, color: '#ef4444' }}
                    >🗑</button>
                  )}
                </div>
              </div>
            )
          })}

          {/* Create new account */}
          <div style={{
            marginTop: 12, padding: '12px 14px',
            background: 'var(--bg2)', borderRadius: 8,
            border: '1px dashed var(--border)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.7px' }}>
              New Account
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input
                placeholder="Account name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                style={inputStyle}
              />
              <select
                value={newType}
                onChange={e => { setNewType(e.target.value); setNewBalance(e.target.value === 'prop' ? '50000' : '10000') }}
                style={{ ...inputStyle, flex: '0 0 80px' }}
              >
                <option value="prop">Prop</option>
                <option value="paper">Paper</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="number"
                placeholder="Starting balance"
                value={newBalance}
                onChange={e => setNewBalance(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button onClick={handleCreate} style={createBtnStyle}>
                + Create
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const inputStyle = {
  flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)',
  borderRadius: 5, padding: '6px 9px', color: 'var(--text)',
  fontSize: 11, fontFamily: 'inherit', outline: 'none',
}

const iconBtnStyle = {
  width: 24, height: 24, borderRadius: 4, background: 'var(--bg3)',
  border: '1px solid var(--border)', color: 'var(--muted)',
  cursor: 'pointer', fontSize: 12, display: 'flex',
  alignItems: 'center', justifyContent: 'center', padding: 0,
}

const createBtnStyle = {
  padding: '6px 14px', background: 'var(--accent)',
  border: 'none', borderRadius: 5,
  color: '#fff', fontWeight: 700, fontSize: 11,
  fontFamily: 'inherit', cursor: 'pointer',
}
