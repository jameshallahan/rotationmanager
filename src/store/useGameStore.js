import { create } from 'zustand'

export const useGameStore = create((set, get) => ({
  // State
  players: [],
  matches: [],
  currentMatch: null,
  matchPlayers: [],
  rotationEvents: [],
  gameState: { quarter: 1, isRunning: false, quarterSeconds: 0 },
  selectedPlayerId: null,
  playerTimers: {}, // { [playerId]: { togSeconds: 0, zoneSeconds: { FORWARD: 0, MIDFIELD: 0, DEFENCE: 0, BENCH: 0 }, lastTickPosition: 'BENCH' } }
  quarterHistory: {}, // { [quarter]: { report data } }
  showQuarterReport: false,

  // Player CRUD
  addPlayer: (player) => set(s => ({ players: [...s.players, { ...player, id: Date.now().toString() }] })),
  updatePlayer: (id, data) => set(s => ({ players: s.players.map(p => p.id === id ? { ...p, ...data } : p) })),
  deletePlayer: (id) => set(s => ({ players: s.players.filter(p => p.id !== id) })),

  // Match management
  createMatch: (data) => {
    const match = { ...data, id: Date.now().toString(), created_at: new Date().toISOString() }
    set(s => ({ matches: [...s.matches, match], currentMatch: match, matchPlayers: [], rotationEvents: [], gameState: { quarter: 1, isRunning: false, quarterSeconds: 0 }, playerTimers: {} }))
    return match
  },
  setMatchPlayers: (matchPlayers) => set({ matchPlayers }),

  // Selection and rotation
  selectPlayer: (playerId) => {
    const { selectedPlayerId, matchPlayers, rotationEvents, gameState, playerTimers } = get()

    if (!selectedPlayerId) {
      // First tap: select
      set({ selectedPlayerId: playerId })
      return
    }

    if (selectedPlayerId === playerId) {
      // Tap same: deselect
      set({ selectedPlayerId: null })
      return
    }

    // Second tap on different player: execute rotation/swap
    const player1Mp = matchPlayers.find(mp => mp.player_id === selectedPlayerId)
    const player2Mp = matchPlayers.find(mp => mp.player_id === playerId)

    if (!player1Mp || !player2Mp) return

    const fromPos = player1Mp.current_position
    const toPos = player2Mp.current_position

    const now = new Date()
    const event1 = {
      id: `evt_${Date.now()}_1`,
      match_id: player1Mp.match_id,
      player_id: selectedPlayerId,
      event_type: toPos === 'BENCH' ? 'FIELD_OFF' : 'POSITION_CHANGE',
      from_position: fromPos,
      to_position: toPos,
      quarter: gameState.quarter,
      quarter_time_seconds: gameState.quarterSeconds,
      wall_time: now.toISOString(),
    }
    const event2 = {
      id: `evt_${Date.now()}_2`,
      match_id: player2Mp.match_id,
      player_id: playerId,
      event_type: fromPos === 'BENCH' ? 'FIELD_ON' : 'POSITION_CHANGE',
      from_position: toPos,
      to_position: fromPos,
      quarter: gameState.quarter,
      quarter_time_seconds: gameState.quarterSeconds,
      wall_time: now.toISOString(),
    }

    // Swap positions
    const newMatchPlayers = matchPlayers.map(mp => {
      if (mp.player_id === selectedPlayerId) return { ...mp, current_position: toPos }
      if (mp.player_id === playerId) return { ...mp, current_position: fromPos }
      return mp
    })

    set({
      matchPlayers: newMatchPlayers,
      rotationEvents: [...rotationEvents, event1, event2],
      selectedPlayerId: null,
    })

    // Update playerTimers to reflect new positions
    const newTimers = { ...playerTimers }
    if (newTimers[selectedPlayerId]) newTimers[selectedPlayerId] = { ...newTimers[selectedPlayerId], lastTickPosition: toPos }
    if (newTimers[playerId]) newTimers[playerId] = { ...newTimers[playerId], lastTickPosition: fromPos }
    set({ playerTimers: newTimers })

    get().saveToLocalStorage()
  },

  markInjured: (playerId) => {
    const { matchPlayers } = get()
    set({
      matchPlayers: matchPlayers.map(mp =>
        mp.player_id === playerId ? { ...mp, status: 'INJURED', current_position: 'BENCH' } : mp
      )
    })
    get().saveToLocalStorage()
  },

  returnFromInjury: (playerId) => {
    const { matchPlayers } = get()
    set({
      matchPlayers: matchPlayers.map(mp =>
        mp.player_id === playerId ? { ...mp, status: 'ACTIVE' } : mp
      )
    })
    get().saveToLocalStorage()
  },

  // Game clock
  tickSecond: () => {
    const { gameState, matchPlayers, playerTimers } = get()
    if (!gameState.isRunning) return

    const newQuarterSeconds = gameState.quarterSeconds + 1
    const newTimers = { ...playerTimers }

    matchPlayers.forEach(mp => {
      if (mp.status === 'INJURED') return
      if (!newTimers[mp.player_id]) {
        newTimers[mp.player_id] = { togSeconds: 0, zoneSeconds: { FORWARD: 0, MIDFIELD: 0, DEFENCE: 0, BENCH: 0 }, lastTickPosition: mp.current_position }
      }
      const timer = { ...newTimers[mp.player_id] }
      const pos = mp.current_position
      timer.zoneSeconds = { ...timer.zoneSeconds, [pos]: (timer.zoneSeconds[pos] || 0) + 1 }
      if (pos !== 'BENCH') timer.togSeconds = (timer.togSeconds || 0) + 1
      timer.lastTickPosition = pos
      newTimers[mp.player_id] = timer
    })

    set({ gameState: { ...gameState, quarterSeconds: newQuarterSeconds }, playerTimers: newTimers })
  },

  startQuarter: () => {
    set(s => ({ gameState: { ...s.gameState, isRunning: true } }))
    get().saveToLocalStorage()
  },

  pauseQuarter: () => {
    set(s => ({ gameState: { ...s.gameState, isRunning: false } }))
    get().saveToLocalStorage()
  },

  endQuarter: () => {
    const { gameState, playerTimers, quarterHistory } = get()
    const report = { quarter: gameState.quarter, playerTimers: { ...playerTimers }, quarterSeconds: gameState.quarterSeconds }
    set(s => ({
      gameState: { ...s.gameState, isRunning: false },
      quarterHistory: { ...quarterHistory, [gameState.quarter]: report },
      showQuarterReport: true,
    }))
    get().saveToLocalStorage()
  },

  startNextQuarter: () => {
    const { gameState } = get()
    set({
      gameState: { quarter: Math.min(gameState.quarter + 1, 4), isRunning: false, quarterSeconds: 0 },
      showQuarterReport: false,
    })
  },

  dismissQuarterReport: () => set({ showQuarterReport: false }),

  // LocalStorage
  saveToLocalStorage: () => {
    const { players, matches, currentMatch, matchPlayers, rotationEvents, gameState, playerTimers, quarterHistory } = get()
    try {
      localStorage.setItem('rotationiq', JSON.stringify({ players, matches, currentMatch, matchPlayers, rotationEvents, gameState, playerTimers, quarterHistory }))
    } catch (e) { console.warn('localStorage save failed', e) }
  },

  loadFromLocalStorage: () => {
    try {
      const data = localStorage.getItem('rotationiq')
      if (data) {
        const parsed = JSON.parse(data)
        set(parsed)
      }
    } catch (e) { console.warn('localStorage load failed', e) }
  },
}))
