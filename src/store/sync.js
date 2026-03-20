import { supabase } from '../lib/supabase'

// ─── Debounce helper ────────────────────────────────────────────────────────
const settingsTimers = new Map()
const DEBOUNCE_MS = 1000

function debounceSettings(userId, data) {
  clearTimeout(settingsTimers.get(userId))
  settingsTimers.set(userId, setTimeout(() => {
    settingsTimers.delete(userId)
    pushUserSettings(userId, data)
  }, DEBOUNCE_MS))
}

export function cancelAllTimers() {
  settingsTimers.forEach(id => clearTimeout(id))
  settingsTimers.clear()
}

// ─── FETCH (hydration) ─────────────────────────────────────────────────────

export async function fetchUserData(userId) {
  let settings, journal, quiz, account, paper
  try {
    ;[settings, journal, quiz, account, paper] = await Promise.all([
      supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('journal_trades').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('quiz_history').select('*').eq('user_id', userId).order('date'),
      supabase.from('accounts').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('paper_accounts').select('*').eq('user_id', userId).maybeSingle(),
    ])
  } catch (err) {
    console.error('sync: fetchUserData network error', err)
    return { state: {}, hasRemoteData: false, error: err }
  }

  if (settings.error) { console.error('sync: user_settings fetch failed', settings.error); return { state: {}, hasRemoteData: false, error: settings.error } }
  if (journal.error)  { console.error('sync: journal_trades fetch failed', journal.error);  return { state: {}, hasRemoteData: false, error: journal.error } }
  if (quiz.error)     { console.error('sync: quiz_history fetch failed', quiz.error);        return { state: {}, hasRemoteData: false, error: quiz.error } }
  if (account.error)  { console.error('sync: accounts fetch failed', account.error);         return { state: {}, hasRemoteData: false, error: account.error } }
  if (paper.error)    { console.error('sync: paper_accounts fetch failed', paper.error);     return { state: {}, hasRemoteData: false, error: paper.error } }

  // Check if user has ANY data in Supabase
  const hasRemoteData = !!(settings.data || account.data || paper.data ||
    (journal.data && journal.data.length > 0) || (quiz.data && quiz.data.length > 0))

  const state = {}

  if (settings.data) {
    const s = settings.data
    state.indicators = s.indicators
    state.smcLayers = s.smc_layers
    state.sessions = s.sessions
    state.magnetEnabled = s.magnet_enabled
    state.brStrategy = s.br_strategy
    state.drawings = s.drawings
    state.completedConcepts = s.completed_concepts
    state.dailyChecklist = s.daily_checklist
    state.dailyNotes = s.daily_notes
  }

  if (journal.data && journal.data.length > 0) {
    state.journal = journal.data.map(row => ({
      id: row.id,
      date: row.date,
      symbol: row.symbol,
      direction: row.direction,
      entryPrice: Number(row.entry_price),
      exitPrice: Number(row.exit_price),
      stopLoss: Number(row.stop_loss),
      target: row.take_profit != null ? Number(row.take_profit) : null,
      contracts: row.contracts,
      setup: row.setup,
      notes: row.notes,
      pnl: Number(row.pnl),
      rr: row.rr != null ? Number(row.rr) : null,
    }))
  }

  if (quiz.data && quiz.data.length > 0) {
    state.quizHistory = quiz.data.map(row => ({
      id: row.id,
      date: row.date,
      score: row.score,
      total: row.total,
      category: row.category,
      difficulty: row.difficulty,
      questions: row.questions,
    }))
  }

  if (account.data) {
    state.account = {
      startingBalance: Number(account.data.starting_balance),
      balance: Number(account.data.balance),
      peakBalance: Number(account.data.peak_balance),
      dailyPnL: account.data.daily_pnl,
    }
  }

  if (paper.data) {
    state.paperAccount = {
      startingBalance: Number(paper.data.starting_balance),
      balance: Number(paper.data.balance),
      trades: paper.data.trades,
    }
  }

  return { state, hasRemoteData }
}

// ─── PUSH functions ─────────────────────────────────────────────────────────

async function pushUserSettings(userId, data) {
  const { error } = await supabase.from('user_settings').upsert({
    user_id: userId,
    indicators: data.indicators,
    smc_layers: data.smcLayers,
    sessions: data.sessions,
    magnet_enabled: data.magnetEnabled,
    br_strategy: data.brStrategy,
    drawings: data.drawings,
    completed_concepts: data.completedConcepts,
    daily_checklist: data.dailyChecklist,
    daily_notes: data.dailyNotes,
    updated_at: new Date().toISOString(),
  })
  if (error) console.error('sync: user_settings upsert failed', error)
}

// Debounced version for rapid toggles
export function syncSettings(userId, data) {
  debounceSettings(userId, data)
}

// Immediate version for less frequent updates
export function syncSettingsNow(userId, data) {
  clearTimeout(settingsTimers.get(userId))
  settingsTimers.delete(userId)
  pushUserSettings(userId, data)
}

export async function syncJournalAdd(userId, trade) {
  const { error } = await supabase.from('journal_trades').upsert({
    id: trade.id,
    user_id: userId,
    date: trade.date,
    symbol: trade.symbol,
    direction: trade.direction,
    entry_price: trade.entryPrice,
    exit_price: trade.exitPrice,
    stop_loss: trade.stopLoss,
    take_profit: trade.target,
    contracts: trade.contracts,
    setup: trade.setup,
    notes: trade.notes,
    pnl: trade.pnl,
    rr: trade.rr,
  })
  if (error) console.error('sync: journal_trades upsert failed', error)
}

export async function syncJournalUpdate(userId, id, patch) {
  // Map client field names to DB column names
  const columnMap = {
    date: 'date', symbol: 'symbol', direction: 'direction',
    entryPrice: 'entry_price', exitPrice: 'exit_price',
    stopLoss: 'stop_loss', target: 'take_profit',
    contracts: 'contracts', setup: 'setup', notes: 'notes',
    pnl: 'pnl', rr: 'rr',
  }
  const dbPatch = {}
  for (const [k, v] of Object.entries(patch)) {
    if (columnMap[k]) dbPatch[columnMap[k]] = v
  }
  const { error } = await supabase.from('journal_trades').update(dbPatch).eq('id', id).eq('user_id', userId)
  if (error) console.error('sync: journal_trades update failed', error)
}

export async function syncJournalDelete(userId, id) {
  const { error } = await supabase.from('journal_trades').delete().eq('id', id).eq('user_id', userId)
  if (error) console.error('sync: journal_trades delete failed', error)
}

export async function syncQuizResult(userId, result) {
  const { error } = await supabase.from('quiz_history').insert({
    id: result.id,
    user_id: userId,
    date: result.date,
    score: result.score,
    total: result.total,
    category: result.category,
    difficulty: result.difficulty,
    questions: result.questions,
  })
  if (error) console.error('sync: quiz_history insert failed', error)
}

export async function syncAccount(userId, account) {
  const { error } = await supabase.from('accounts').upsert({
    user_id: userId,
    starting_balance: account.startingBalance,
    balance: account.balance,
    peak_balance: account.peakBalance,
    daily_pnl: account.dailyPnL,
    updated_at: new Date().toISOString(),
  })
  if (error) console.error('sync: accounts upsert failed', error)
}

export async function syncPaperAccount(userId, paperAccount) {
  const { error } = await supabase.from('paper_accounts').upsert({
    user_id: userId,
    starting_balance: paperAccount.startingBalance,
    balance: paperAccount.balance,
    trades: paperAccount.trades,
    updated_at: new Date().toISOString(),
  })
  if (error) console.error('sync: paper_accounts upsert failed', error)
}

// ─── INIT (create default rows for new user) ───────────────────────────────

export async function initUserData(userId) {
  await Promise.all([
    supabase.from('user_settings').upsert({ user_id: userId }),
    supabase.from('accounts').upsert({ user_id: userId }),
    supabase.from('paper_accounts').upsert({ user_id: userId }),
  ])
}
