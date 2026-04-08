import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  fetchUserData, syncSettings, syncSettingsNow,
  syncJournalAdd, syncJournalUpdate, syncJournalDelete,
  syncQuizResult, syncAccount, syncPaperAccount, initUserData,
  cancelAllTimers,
} from './sync'

// Helper: downsample equity curve to maxPoints for storage
function downsampleCurve(curve, maxPoints) {
  if (!curve || curve.length <= maxPoints) return curve
  const step = curve.length / maxPoints
  const result = []
  for (let i = 0; i < maxPoints; i++) {
    result.push(curve[Math.floor(i * step)])
  }
  // Always include the last point
  if (result[result.length - 1] !== curve[curve.length - 1]) {
    result.push(curve[curve.length - 1])
  }
  return result
}

// Helper: get settings-related fields for sync
const getSettingsPayload = (s) => ({
  indicators: s.indicators,
  smcLayers: s.smcLayers,
  sessions: s.sessions,
  magnetEnabled: s.magnetEnabled,
  brStrategy: s.brStrategy,
  drawings: s.drawings,
  completedConcepts: s.completedConcepts,
  dailyChecklist: s.dailyChecklist,
  dailyNotes: s.dailyNotes,
})

const useStore = create(
  persist(
    (set, get) => ({

      // ─── AUTH STATE ─────────────────────────────────────────────────
      _userId: null,
      _hydrated: false,

      hydrateFromSupabase: async (userId) => {
        set({ _userId: userId })
        const { state, hasRemoteData, error } = await fetchUserData(userId)
        if (error) {
          console.error('store: hydration failed, continuing with local state', error)
          set({ _hydrated: true })
          return false
        }
        if (hasRemoteData) {
          set({ ...state, _hydrated: true })
        } else {
          // New user with no remote data — create default rows
          await initUserData(userId)
          set({ _hydrated: true })
        }
        return hasRemoteData
      },

      clearOnLogout: () => { cancelAllTimers(); set({
        _userId: null,
        _hydrated: false,
        completedConcepts: [],
        quizHistory: [],
        journal: [],
        dailyChecklist: {},
        dailyNotes: {},
        account: { startingBalance: 50000, balance: 50000, peakBalance: 50000, dailyPnL: {} },
        drawings: [],
        indicators: { vwap: true, ema9: false, ema21: true, ema50: false, rsi: false, volume: true },
        smcLayers: { fvg: true, ob: true, liq: true },
        sessions: { asia: false, london: false, ny: false, asiaHL: false, londonHL: false, nyHL: false, killZones: false },
        magnetEnabled: false,
        brStrategy: false,
        paperAccount: { startingBalance: 10000, balance: 10000, trades: [] },
      }) },

      // ─── LEARN ─────────────────────────────────────────────────────
      completedConcepts: [],
      markConceptDone: (id) => {
        set(s => ({
          completedConcepts: s.completedConcepts.includes(id)
            ? s.completedConcepts
            : [...s.completedConcepts, id],
        }))
        const s = get()
        if (s._userId) syncSettingsNow(s._userId, getSettingsPayload(s))
      },
      unmarkConceptDone: (id) => {
        set(s => ({
          completedConcepts: s.completedConcepts.filter(c => c !== id),
        }))
        const s = get()
        if (s._userId) syncSettingsNow(s._userId, getSettingsPayload(s))
      },

      // ─── QUIZ ──────────────────────────────────────────────────────
      quizHistory: [],
      saveQuizResult: (result) => {
        const entry = { ...result, id: crypto.randomUUID(), date: new Date().toISOString() }
        set(s => ({ quizHistory: [...s.quizHistory, entry] }))
        const s = get()
        if (s._userId) syncQuizResult(s._userId, entry)
      },

      // ─── JOURNAL ───────────────────────────────────────────────────
      journal: [],
      addTrade: (trade) => {
        const newTrade = { ...trade, id: crypto.randomUUID() }
        set(s => ({ journal: [...s.journal, newTrade] }))
        const s = get()
        if (s._userId) syncJournalAdd(s._userId, newTrade)
      },
      updateTrade: (id, patch) => {
        set(s => ({
          journal: s.journal.map(t => (t.id === id ? { ...t, ...patch } : t)),
        }))
        const s = get()
        if (s._userId) syncJournalUpdate(s._userId, id, patch)
      },
      deleteTrade: (id) => {
        set(s => ({
          journal: s.journal.filter(t => t.id !== id),
        }))
        const s = get()
        if (s._userId) syncJournalDelete(s._userId, id)
      },

      // ─── DAILY CHECKLIST ───────────────────────────────────────────
      dailyChecklist: {},
      toggleChecklistItem: (date, itemId) => {
        set(s => {
          const day = s.dailyChecklist[date] || {}
          return {
            dailyChecklist: {
              ...s.dailyChecklist,
              [date]: { ...day, [itemId]: !day[itemId] },
            },
          }
        })
        const s = get()
        if (s._userId) syncSettings(s._userId, getSettingsPayload(s))
      },

      // ─── DAILY NOTES ───────────────────────────────────────────────
      dailyNotes: {},
      setDailyNote: (date, text) => {
        set(s => ({
          dailyNotes: { ...s.dailyNotes, [date]: text },
        }))
        const s = get()
        if (s._userId) syncSettings(s._userId, getSettingsPayload(s))
      },

      // ─── ACCOUNT / PROP TRACKER ────────────────────────────────────
      account: {
        startingBalance: 50000,
        balance: 50000,
        peakBalance: 50000,
        dailyPnL: {},
      },
      updateAccountPnL: (date, delta) => {
        set(s => {
          const prev = s.account.dailyPnL[date] || 0
          const newBalance = s.account.balance + delta
          const newPeak = Math.max(s.account.peakBalance, newBalance)
          return {
            account: {
              ...s.account,
              balance: newBalance,
              peakBalance: newPeak,
              dailyPnL: { ...s.account.dailyPnL, [date]: prev + delta },
            },
          }
        })
        const s = get()
        if (s._userId) syncAccount(s._userId, s.account)
      },
      resetAccount: () => {
        set(s => ({
          account: { startingBalance: 50000, balance: 50000, peakBalance: 50000, dailyPnL: {} },
          paperAccount: {
            ...s.paperAccount,
            trades: s.paperAccount.trades.filter(t => t.accountType !== 'prop'),
          },
        }))
        const s = get()
        if (s._userId) {
          syncAccount(s._userId, s.account)
          syncPaperAccount(s._userId, s.paperAccount)
        }
      },

      // ─── PRACTICE CHART ────────────────────────────────────────────
      indicators: { vwap: true, ema9: false, ema21: true, ema50: false, rsi: false, volume: true },
      setIndicator: (key, val) => {
        set(s => ({ indicators: { ...s.indicators, [key]: val } }))
        const s = get()
        if (s._userId) syncSettings(s._userId, getSettingsPayload(s))
      },
      smcLayers: { fvg: true, ob: true, liq: true },
      setSMCLayer: (key, val) => {
        set(s => ({ smcLayers: { ...s.smcLayers, [key]: val } }))
        const s = get()
        if (s._userId) syncSettings(s._userId, getSettingsPayload(s))
      },

      sessions: { asia: false, london: false, ny: false, asiaHL: false, londonHL: false, nyHL: false, killZones: false },
      setSession: (key, val) => {
        set(s => ({ sessions: { ...s.sessions, [key]: val } }))
        const s = get()
        if (s._userId) syncSettings(s._userId, getSettingsPayload(s))
      },

      magnetEnabled: false,
      setMagnetEnabled: (val) => {
        set({ magnetEnabled: val })
        const s = get()
        if (s._userId) syncSettings(s._userId, getSettingsPayload(s))
      },

      brStrategy: false,
      setBrStrategy: (val) => {
        set({ brStrategy: val })
        const s = get()
        if (s._userId) syncSettings(s._userId, getSettingsPayload(s))
      },

      drawings: [],
      addDrawing: (drawing) => {
        set(s => ({ drawings: [...s.drawings, drawing] }))
        const s = get()
        if (s._userId) syncSettings(s._userId, getSettingsPayload(s))
      },
      updateDrawing: (id, patch) => {
        set(s => ({
          drawings: s.drawings.map(d => d.id === id ? { ...d, ...patch } : d),
        }))
        const s = get()
        if (s._userId) syncSettings(s._userId, getSettingsPayload(s))
      },
      removeDrawing: (id) => {
        set(s => ({ drawings: s.drawings.filter(d => d.id !== id) }))
        const s = get()
        if (s._userId) syncSettings(s._userId, getSettingsPayload(s))
      },
      clearDrawings: () => {
        set({ drawings: [] })
        const s = get()
        if (s._userId) syncSettings(s._userId, getSettingsPayload(s))
      },

      // ─── BACKTEST HISTORY ──────────────────────────────────────────
      backtestHistory: [],
      saveBacktestResult: (result) => {
        const entry = {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          strategyId: result.strategyId,
          strategyName: result.strategyName,
          symbol: result.symbol,
          timeframe: result.timeframe,
          params: result.params,
          metrics: result.metrics,
          trades: result.trades,
          // Downsample equity curve to max 200 points
          equityCurve: downsampleCurve(result.equityCurve, 200),
        }
        set(s => ({
          backtestHistory: [entry, ...s.backtestHistory].slice(0, 50),
        }))
      },
      deleteBacktestResult: (id) => set(s => ({
        backtestHistory: s.backtestHistory.filter(r => r.id !== id),
      })),
      clearBacktestHistory: () => set({ backtestHistory: [] }),

      // ─── STRATEGY VARIANTS ─────────────────────────────────────────
      strategyVariants: [],

      addVariant: (variant) => set((s) => {
        // If name collision: overwrite the existing variant
        const existing = s.strategyVariants.find(v => v.name === variant.name);
        if (existing) {
          return {
            strategyVariants: s.strategyVariants.map(v =>
              v.name === variant.name
                ? { ...variant, id: v.id }  // keep original id, update everything else
                : v
            )
          };
        }
        // Prepend new variant; prune oldest if over 20
        const updated = [variant, ...s.strategyVariants];
        if (updated.length > 20) {
          updated.pop();  // remove oldest (last element)
        }
        return { strategyVariants: updated };
      }),

      deleteVariant: (id) => set((s) => ({
        strategyVariants: s.strategyVariants.filter(v => v.id !== id),
      })),

      clearVariants: () => set({ strategyVariants: [] }),

      // ─── WATCHLIST ─────────────────────────────────────────────────
      watchlist: ['ES=F', 'NQ=F', 'MES=F'],
      addToWatchlist: (symbol) => set(s => ({
        watchlist: s.watchlist.includes(symbol) ? s.watchlist : [...s.watchlist, symbol],
      })),
      removeFromWatchlist: (symbol) => set(s => ({
        watchlist: s.watchlist.filter(t => t !== symbol),
      })),

      // ─── NAMED ACCOUNTS ────────────────────────────────────────────
      // Each: { id, name, type: 'prop'|'paper', startingBalance, balance, peakBalance, dailyPnL:{} }
      namedAccounts: [
        { id: 'default-prop',  name: 'Prop 50K',       type: 'prop',  startingBalance: 50000, balance: 50000, peakBalance: 50000, dailyPnL: {} },
        { id: 'default-paper', name: 'Paper Trading',  type: 'paper', startingBalance: 10000, balance: 10000, peakBalance: 10000, dailyPnL: {} },
      ],
      activeAccountId: 'default-prop',
      createNamedAccount: (name, type, startingBalance) => set(s => ({
        namedAccounts: [...s.namedAccounts, {
          id: crypto.randomUUID(), name, type,
          startingBalance, balance: startingBalance,
          peakBalance: startingBalance, dailyPnL: {},
        }],
      })),
      deleteNamedAccount: (id) => set(s => {
        if (id === 'default-prop' || id === 'default-paper') return {}
        return {
          namedAccounts: s.namedAccounts.filter(a => a.id !== id),
          activeAccountId: s.activeAccountId === id ? 'default-prop' : s.activeAccountId,
        }
      }),
      renameNamedAccount: (id, name) => set(s => ({
        namedAccounts: s.namedAccounts.map(a => a.id === id ? { ...a, name } : a),
      })),
      setActiveAccount: (id) => set({ activeAccountId: id }),
      updateNamedAccountPnL: (id, pnl, date) => set(s => {
        const acc = s.namedAccounts.find(a => a.id === id)
        if (!acc) return {}
        const newBalance = acc.balance + pnl
        const newPeak = Math.max(acc.peakBalance, newBalance)
        const prev = acc.dailyPnL[date] || 0
        return {
          namedAccounts: s.namedAccounts.map(a => a.id === id ? {
            ...a, balance: newBalance, peakBalance: newPeak,
            dailyPnL: { ...a.dailyPnL, [date]: prev + pnl },
          } : a),
        }
      }),
      resetNamedAccount: (id) => set(s => ({
        namedAccounts: s.namedAccounts.map(a => a.id === id ? {
          ...a, balance: a.startingBalance, peakBalance: a.startingBalance, dailyPnL: {},
        } : a),
      })),

      // Paper trading account
      paperAccount: { startingBalance: 10000, balance: 10000, trades: [] },
      setPaperStartingBalance: (bal) => {
        set(s => ({
          paperAccount: { ...s.paperAccount, startingBalance: bal },
        }))
        const s = get()
        if (s._userId) syncPaperAccount(s._userId, s.paperAccount)
      },
      resetPaperAccount: (bal) => {
        set(s => {
          const b = bal ?? s.paperAccount.startingBalance
          return { paperAccount: { startingBalance: b, balance: b, trades: [] } }
        })
        const s = get()
        if (s._userId) syncPaperAccount(s._userId, s.paperAccount)
      },

      updatePaperTrade: (id, patch) => {
        set(s => ({
          paperAccount: {
            ...s.paperAccount,
            trades: s.paperAccount.trades.map(t => t.id === id ? { ...t, ...patch } : t),
          },
        }))
        const s = get()
        if (s._userId) syncPaperAccount(s._userId, s.paperAccount)
      },

      addPaperTrade: (trade) => {
        const date = (trade.date ?? new Date().toISOString()).split('T')[0]
        const withId = { ...trade, id: trade.id ?? crypto.randomUUID() }
        set(s => {
          // Update the named account P&L for the active account
          const activeAcc = s.namedAccounts.find(a => a.id === s.activeAccountId)
          const updatedNamed = activeAcc ? s.namedAccounts.map(a => {
            if (a.id !== s.activeAccountId) return a
            const newBal  = a.balance + trade.pnl
            const newPeak = Math.max(a.peakBalance, newBal)
            const prev    = a.dailyPnL[date] || 0
            return { ...a, balance: newBal, peakBalance: newPeak, dailyPnL: { ...a.dailyPnL, [date]: prev + trade.pnl } }
          }) : s.namedAccounts

          if (trade.accountType === 'prop') {
            const newBal  = s.account.balance + trade.pnl
            const newPeak = Math.max(s.account.peakBalance, newBal)
            const prevDay = s.account.dailyPnL[date] || 0
            return {
              namedAccounts: updatedNamed,
              account: {
                ...s.account,
                balance: newBal,
                peakBalance: newPeak,
                dailyPnL: { ...s.account.dailyPnL, [date]: prevDay + trade.pnl },
              },
              paperAccount: {
                ...s.paperAccount,
                trades: [...s.paperAccount.trades, withId],
              },
            }
          }
          return {
            namedAccounts: updatedNamed,
            paperAccount: {
              ...s.paperAccount,
              balance: s.paperAccount.balance + trade.pnl,
              trades: [...s.paperAccount.trades, withId],
            },
          }
        })
        const s = get()
        if (s._userId) {
          syncPaperAccount(s._userId, s.paperAccount)
          if (trade.accountType === 'prop') syncAccount(s._userId, s.account)
        }
      },
    }),

    {
      name: 'es-academy-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        completedConcepts: s.completedConcepts,
        quizHistory: s.quizHistory,
        journal: s.journal,
        dailyChecklist: s.dailyChecklist,
        dailyNotes: s.dailyNotes,
        account: s.account,
        drawings: s.drawings,
        indicators: s.indicators,
        smcLayers: s.smcLayers,
        sessions: s.sessions,
        magnetEnabled: s.magnetEnabled,
        brStrategy: s.brStrategy,
        paperAccount: s.paperAccount,
        backtestHistory: s.backtestHistory,
        strategyVariants: s.strategyVariants,
        watchlist: s.watchlist,
        namedAccounts: s.namedAccounts,
        activeAccountId: s.activeAccountId,
      }),
    }
  )
)

export default useStore
