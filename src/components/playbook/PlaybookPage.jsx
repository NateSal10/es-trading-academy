import { useState } from 'react';
import { format } from 'date-fns';
import useStore from '../../store';
import { CHECKLIST_SECTIONS, CHECKLIST_ITEMS } from '../../data/checklistData';

const TODAY = format(new Date(), 'yyyy-MM-dd');

function Section({ section, items, checklist, onToggle, dailyNote, onNoteChange }) {
  const [open, setOpen] = useState(true);
  const done = items.filter(i => checklist[i.id]).length;

  return (
    <div style={{ marginBottom: '8px' }}>
      <div className="section-header" onClick={() => setOpen(o => !o)}>
        <span>{section.label} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({done}/{items.length})</span></span>
        <span style={{ fontSize: '14px', color: 'var(--muted)' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ paddingLeft: '4px' }}>
          {items.map(item => {
            const checked = !!checklist[item.id];
            return (
              <div key={item.id} className="pb-check-item" onClick={() => onToggle(item.id)}>
                <div className={`pb-checkbox${checked ? ' checked' : ''}`}>
                  {checked && <span style={{ fontSize: '11px', color: '#fff', fontWeight: 700 }}>✓</span>}
                </div>
                <span className={`pb-check-text${checked ? ' checked' : ''}`}>{item.label}</span>
              </div>
            );
          })}
          {section.id === 'post_trade' && (
            <div style={{ marginTop: '8px' }}>
              <textarea
                className="notes-textarea"
                placeholder="Daily notes, observations, lessons learned..."
                value={dailyNote}
                onChange={e => onNoteChange(e.target.value)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PlaybookPage() {
  const dailyChecklist  = useStore(s => s.dailyChecklist);
  const toggleItem      = useStore(s => s.toggleChecklistItem);
  const dailyNotes      = useStore(s => s.dailyNotes);
  const setDailyNote    = useStore(s => s.setDailyNote);

  const todayChecklist = dailyChecklist[TODAY] || {};
  const total   = CHECKLIST_ITEMS.length;
  const done    = CHECKLIST_ITEMS.filter(i => todayChecklist[i.id]).length;
  const pct     = Math.round((done / total) * 100);

  return (
    <div className="page">
      {/* Header */}
      <div className="card">
        <div className="badge b-blue">ES Futures — RTH Session Trading</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div className="card-title" style={{ margin: '4px 0 2px' }}>Daily Trading Playbook</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{format(new Date(), 'EEEE, MMMM d, yyyy')}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: pct === 100 ? '#5DCAA5' : 'var(--text)' }}>{pct}%</div>
            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{done}/{total} items</div>
          </div>
        </div>
        <div className="progress-bar-wrap" style={{ marginTop: '10px' }}>
          <div className="progress-bar-fill" style={{ width: `${pct}%`, background: pct === 100 ? 'var(--green)' : 'var(--accent)' }} />
        </div>
      </div>

      {/* Checklist sections */}
      <div className="card">
        {CHECKLIST_SECTIONS.map(section => {
          const items = CHECKLIST_ITEMS.filter(i => i.section === section.id);
          return (
            <Section
              key={section.id}
              section={section}
              items={items}
              checklist={todayChecklist}
              onToggle={id => toggleItem(TODAY, id)}
              dailyNote={dailyNotes[TODAY] || ''}
              onNoteChange={text => setDailyNote(TODAY, text)}
            />
          );
        })}
      </div>

      {/* Prop Firm Rules Quick Reference */}
      <div className="row2">
        <div className="card" style={{ background: 'var(--bg3)' }}>
          <div className="badge b-purple">Alpha Futures Zero 50K — Key Numbers</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.9 }}>
            <div><strong style={{ color: 'var(--text)' }}>Daily Loss Limit:</strong> $2,000</div>
            <div><strong style={{ color: 'var(--text)' }}>Max Trailing DD:</strong> $2,500 from peak</div>
            <div><strong style={{ color: 'var(--text)' }}>Profit Target:</strong> $3,000 to pass eval</div>
            <div><strong style={{ color: 'var(--text)' }}>Min Trading Days:</strong> 10 days</div>
            <div><strong style={{ color: 'var(--text)' }}>Consistency Rule:</strong> No single day &gt; 40% of total profit</div>
          </div>
        </div>
        <div className="card" style={{ background: 'var(--bg3)' }}>
          <div className="badge b-green">Today's Target Windows</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.9 }}>
            <div><strong style={{ color: '#ef7a50' }}>8:00–9:30 AM</strong> — Pre-market prep</div>
            <div><strong style={{ color: '#e8a93a' }}>9:30–10:00 AM</strong> — Opening range (watch only)</div>
            <div><strong style={{ color: '#5DCAA5' }}>10:00–11:30 AM</strong> — Primary trade window ✅</div>
            <div><strong style={{ color: '#ef7a50' }}>11:30–1:30 PM</strong> — Avoid (lunch chop)</div>
            <div><strong style={{ color: '#5DCAA5' }}>1:30–3:00 PM</strong> — Secondary window ✅</div>
            <div><strong style={{ color: '#ef7a50' }}>After 3:30 PM</strong> — Close positions only</div>
          </div>
        </div>
      </div>
    </div>
  );
}
