import { useState } from 'react'
import { format } from 'date-fns'
import useStore from '../../store/index'
import { CHECKLIST_SECTIONS, CHECKLIST_ITEMS } from '../../data/checklistData'

const todayStr = format(new Date(), 'yyyy-MM-dd')
const todayLabel = format(new Date(), 'EEEE, MMM d')

export default function DailyChecklist() {
  const dailyChecklist = useStore(s => s.dailyChecklist)
  const toggleChecklistItem = useStore(s => s.toggleChecklistItem)
  const [collapsed, setCollapsed] = useState({})

  const todayData = dailyChecklist[todayStr] || {}

  const completedCount = CHECKLIST_ITEMS.filter(item => todayData[item.id]).length
  const totalCount = CHECKLIST_ITEMS.length

  function toggleSection(sectionId) {
    setCollapsed(prev => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
        <div className="card-title" style={{ marginBottom: 0 }}>Today's Checklist</div>
        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{todayLabel}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <div style={{ flex: 1, height: '4px', background: 'var(--bg3)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${Math.round((completedCount / totalCount) * 100)}%`,
            background: completedCount === totalCount ? 'var(--green)' : 'var(--accent)',
            borderRadius: '2px',
            transition: 'width 0.3s ease',
          }} />
        </div>
        <span style={{ fontSize: '12px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
          {completedCount} / {totalCount}
        </span>
      </div>

      {CHECKLIST_SECTIONS.map(section => {
        const sectionItems = CHECKLIST_ITEMS.filter(i => i.section === section.id)
        const sectionDone = sectionItems.filter(i => todayData[i.id]).length
        const isCollapsed = collapsed[section.id]

        return (
          <div key={section.id} style={{ marginBottom: '4px' }}>
            <button
              onClick={() => toggleSection(section.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 0',
                color: 'var(--muted)',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                fontFamily: 'inherit',
              }}
            >
              <span>{section.label}</span>
              <span style={{ fontSize: '11px', color: sectionDone === sectionItems.length ? 'var(--green)' : 'var(--muted)' }}>
                {sectionDone}/{sectionItems.length} {isCollapsed ? '▶' : '▼'}
              </span>
            </button>

            {!isCollapsed && (
              <ul className="checklist" style={{ marginBottom: '6px' }}>
                {sectionItems.map(item => {
                  const checked = !!todayData[item.id]
                  return (
                    <li
                      key={item.id}
                      onClick={() => toggleChecklistItem(todayStr, item.id)}
                      style={{ cursor: 'pointer', color: checked ? 'var(--text)' : 'var(--muted)' }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleChecklistItem(todayStr, item.id)}
                        onClick={e => e.stopPropagation()}
                        style={{ cursor: 'pointer', accentColor: 'var(--accent)', marginTop: '2px', flexShrink: 0 }}
                      />
                      <span style={{ textDecoration: checked ? 'line-through' : 'none', fontSize: '12px' }}>
                        {item.text}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
