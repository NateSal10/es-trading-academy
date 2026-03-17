import TradeEntryForm from './TradeEntryForm'
import TradeTable from './TradeTable'
import JournalStats from './JournalStats'

export default function JournalPage() {
  return (
    <div className="page" style={{ maxWidth: '1100px' }}>
      <div style={{ marginBottom: '18px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>Trade Journal</h2>
        <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
          Log every trade. Review every day. No exceptions.
        </div>
      </div>

      <JournalStats />

      <div className="row2" style={{ alignItems: 'start' }}>
        <div>
          <TradeEntryForm />
        </div>
        <div>
          <TradeTable />
        </div>
      </div>
    </div>
  )
}
