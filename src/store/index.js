import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

const useStore = create(
  persist(
    (set, get) => ({

      // ─── LEARN ─────────────────────────────────────────────────────
      completedConcepts: [],
      markConceptDone: (id) => set(s => ({
        completedConcepts: s.completedConcepts.includes(id)
          ? s.completedConcepts
          : [...s.completedConcepts, id],
      })),
      unmarkConceptDone: (id) => set(s => ({
        completedConcepts: s.completedConcepts.filter(c => c !== id),
      })),

      // ─── QUIZ ──────────────────────────────────────────────────────
      quizHistory: [],
      saveQuizResult: (result) => set(s => ({
        quizHistory: [
          ...s.quizHistory,
          { ...result, id: crypto.randomUUID(), date: new Date().toISOString() },
        ],
      })),

      // ─── JOURNAL ───────────────────────────────────────────────────
      journal: [],
      addTrade: (trade) => set(s => ({
        journal: [...s.journal, { ...trade, id: crypto.randomUUID() }],
      })),
      updateTrade: (id, patch) => set(s => ({
        journal: s.journal.map(t => (t.id === id ? { ...t, ...patch } : t)),
      })),
      deleteTrade: (id) => set(s => ({
        journal: s.journal.filter(t => t.id !== id),
      })),

      // ─── DAILY CHECKLIST ───────────────────────────────────────────
      // { 'YYYY-MM-DD': { itemId: bool } }
      dailyChecklist: {},
      toggleChecklistItem: (date, itemId) => set(s => {
        const day = s.dailyChecklist[date] || {}
        return {
          dailyChecklist: {
            ...s.dailyChecklist,
            [date]: { ...day, [itemId]: !day[itemId] },
          },
        }
      }),

      // ─── DAILY NOTES ───────────────────────────────────────────────
      dailyNotes: {},
      setDailyNote: (date, text) => set(s => ({
        dailyNotes: { ...s.dailyNotes, [date]: text },
      })),

      // ─── ACCOUNT / PROP TRACKER ────────────────────────────────────
      account: {
        startingBalance: 50000,
        balance: 50000,
        peakBalance: 50000,
        dailyPnL: {},
      },
      updateAccountPnL: (date, delta) => set(s => {
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
      }),
      resetAccount: () => set(s => ({
        account: { startingBalance: 50000, balance: 50000, peakBalance: 50000, dailyPnL: {} },
        paperAccount: {
          ...s.paperAccount,
          trades: s.paperAccount.trades.filter(t => t.accountType !== 'prop'),
        },
      })),

      // ─── PRACTICE CHART ────────────────────────────────────────────
      // Indicators & SMC layers (persisted)
      indicators: { vwap: true, ema9: false, ema21: true, ema50: false, rsi: false, volume: true },
      setIndicator: (key, val) => set(s => ({ indicators: { ...s.indicators, [key]: val } })),
      smcLayers: { fvg: true, ob: true, liq: true },
      setSMCLayer: (key, val) => set(s => ({ smcLayers: { ...s.smcLayers, [key]: val } })),

      // Session backgrounds & H/L (asia/london/ny = background band; asiaHL/londonHL/nyHL = H/L lines)
      sessions: { asia: false, london: false, ny: false, asiaHL: false, londonHL: false, nyHL: false },
      setSession: (key, val) => set(s => ({ sessions: { ...s.sessions, [key]: val } })),

      // Magnet / snap to OHLC
      magnetEnabled: false,
      setMagnetEnabled: (val) => set({ magnetEnabled: val }),

      // 15m Break & Retest strategy box
      brStrategy: false,
      setBrStrategy: (val) => set({ brStrategy: val }),

      // Drawings (persisted)
      drawings: [],
      addDrawing: (drawing) => set(s => ({ drawings: [...s.drawings, drawing] })),
      removeDrawing: (id) => set(s => ({ drawings: s.drawings.filter(d => d.id !== id) })),
      clearDrawings: () => set({ drawings: [] }),

      // Paper trading account — free practice (custom balance, no effect on prop tracker)
      paperAccount: { startingBalance: 10000, balance: 10000, trades: [] },
      setPaperStartingBalance: (bal) => set(s => ({
        paperAccount: { ...s.paperAccount, startingBalance: bal },
      })),
      resetPaperAccount: (bal) => set(s => {
        const b = bal ?? s.paperAccount.startingBalance
        return { paperAccount: { startingBalance: b, balance: b, trades: [] } }
      }),

      // Route a completed practice trade to the right account.
      // trade.accountType === 'prop'  → updates account (prop tracker) + appends to paperAccount.trades
      // trade.accountType === 'paper' → updates paperAccount only
      addPaperTrade: (trade) => set(s => {
        const date = (trade.date ?? new Date().toISOString()).split('T')[0]
        const withId = { ...trade, id: crypto.randomUUID() }
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
        // free paper account
        return {
          paperAccount: {
            ...s.paperAccount,
            balance: s.paperAccount.balance + trade.pnl,
            trades: [...s.paperAccount.trades, withId],
          },
        }
      }),
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
