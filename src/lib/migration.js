import { supabase } from './supabase'

/**
 * Migrate localStorage data to Supabase for a newly signed-up user.
 * Returns true on success.
 */
export async function migrateLocalStorageToSupabase(userId) {
  const raw = localStorage.getItem('es-academy-v2')
  if (!raw) return false

  let data
  try {
    const parsed = JSON.parse(raw)
    data = parsed.state ?? parsed
  } catch {
    return false
  }

  const promises = []

  // user_settings
  promises.push(
    supabase.from('user_settings').upsert({
      user_id: userId,
      indicators: data.indicators ?? { vwap: true, ema9: false, ema21: true, ema50: false, rsi: false, volume: true },
      smc_layers: data.smcLayers ?? { fvg: true, ob: true, liq: true },
      sessions: data.sessions ?? { asia: false, london: false, ny: false, asiaHL: false, londonHL: false, nyHL: false },
      magnet_enabled: data.magnetEnabled ?? false,
      br_strategy: data.brStrategy ?? false,
      drawings: data.drawings ?? [],
      completed_concepts: data.completedConcepts ?? [],
      daily_checklist: data.dailyChecklist ?? {},
      daily_notes: data.dailyNotes ?? {},
    })
  )

  // journal trades (bulk insert)
  if (data.journal?.length > 0) {
    const rows = data.journal.map(t => ({
      id: t.id,
      user_id: userId,
      date: t.date,
      symbol: t.symbol,
      direction: t.direction,
      entry_price: t.entryPrice,
      exit_price: t.exitPrice,
      stop_loss: t.stopLoss,
      take_profit: t.target,
      contracts: t.contracts,
      setup: t.setup,
      notes: t.notes,
      pnl: t.pnl,
      rr: t.rr,
    }))
    promises.push(supabase.from('journal_trades').upsert(rows))
  }

  // quiz history (bulk insert)
  if (data.quizHistory?.length > 0) {
    const rows = data.quizHistory.map(q => ({
      id: q.id,
      user_id: userId,
      date: q.date,
      score: q.score,
      total: q.total,
      category: q.category,
      difficulty: q.difficulty,
      questions: q.questions,
    }))
    promises.push(supabase.from('quiz_history').upsert(rows))
  }

  // account
  if (data.account) {
    promises.push(
      supabase.from('accounts').upsert({
        user_id: userId,
        starting_balance: data.account.startingBalance,
        balance: data.account.balance,
        peak_balance: data.account.peakBalance,
        daily_pnl: data.account.dailyPnL,
      })
    )
  }

  // paper account
  if (data.paperAccount) {
    promises.push(
      supabase.from('paper_accounts').upsert({
        user_id: userId,
        starting_balance: data.paperAccount.startingBalance,
        balance: data.paperAccount.balance,
        trades: data.paperAccount.trades,
      })
    )
  }

  const results = await Promise.all(promises)
  const failed = results.filter(r => r.error)
  if (failed.length > 0) {
    console.error('migration: some writes failed', failed.map(r => r.error))
    return false
  }

  return true
}

/** Check if localStorage has any meaningful user data */
export function hasLocalData() {
  const raw = localStorage.getItem('es-academy-v2')
  if (!raw) return false
  try {
    const parsed = JSON.parse(raw)
    const data = parsed.state ?? parsed
    return (
      (data.journal?.length > 0) ||
      (data.quizHistory?.length > 0) ||
      (data.completedConcepts?.length > 0) ||
      (data.account?.balance !== 50000) ||
      (data.paperAccount?.trades?.length > 0) ||
      Object.keys(data.dailyChecklist ?? {}).length > 0
    )
  } catch {
    return false
  }
}
