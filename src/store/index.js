import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  fetchUserData, syncSettings, syncSettingsNow,
  syncJournalAdd, syncJournalUpdate, syncJournalDelete,
  syncQuizResult, syncAccount, syncPaperAccount, initUserData,
} from './sync'

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
        const { state, hasRemoteData } = await fetchUserData(userId)
        if (hasRemoteData) {
          set({ ...state, _hydrated: true })
        } else {
          // New user with no remote data — create default rows
          await initUserData(userId)
          set({ _hydrated: true })
        }
        return hasRemoteData
      },

      clearOnLogout: () => set({
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
        sessions: { asia: false, london: false, ny: false, asiaHL: false, londonHL: false, nyHL: false },
        magnetEnabled: false,
        brStrategy: false,
        paperAccount: { startingBalance: 10000, balance: 10000, trades: [] },
      }),

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

      sessions: { asia: false, london: false, ny: false, asiaHL: false, londonHL: false, nyHL: false },
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

      addPaperTrade: (trade) => {
        const date = (trade.date ?? new Date().toISOString()).split('T')[0]
        const withId = { ...trade, id: crypto.randomUUID() }
        set(s => {
          if (trade.accountType === 'prop') {
            const newBal  = s.account.balance + trade.pnl
            const newPeak = Math.max(s.account.peakBalance, newBal)
            const prevDay = s.account.dailyPnL[date] || 0
            return {
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
      }),
    }
  )
)

export default useStore
