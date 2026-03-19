import { create } from 'zustand'
import { supabase } from '../lib/supabase'

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
  addPlayer: (player) => {
    const newPlayer = { ...player, id: Date.now().toString() }
    set(s => ({ players: [...s.players, newPlayer] }))
    if (supabase) {
      supabase.from('players').insert(newPlayer)
        .then(({ error }) => { if (error) console.error('addPlayer:', error) })
    } else {
      get().saveToLocalStorage()
    }
  },

  updatePlayer: (id, data) => {
    set(s => ({ players: s.players.map(p => p.id === id ? { ...p, ...data } : p) }))
    if (supabase) {
      supabase.from('players').update(data).eq('id', id)
        .then(({ error }) => { if (error) console.error('updatePlayer:', error) })
    } else {
      get().saveToLocalStorage()
    }
  },

  deletePlayer: (id) => {
    set(s => ({ players: s.players.filter(p => p.id !== id) }))
    if (supabase) {
      supabase.from('players').delete().eq('id', id)
        .then(({ error }) => { if (error) console.error('deletePlayer:', error) })
    } else {
      get().saveToLocalStorage()
    }
  },

  // Match management
  createMatch: (data) => {
    const match = {
      ...data,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      game_state: { quarter: 1, isRunning: false, quarterSeconds: 0 },
      quarter_history: {},
    }
    set(s => ({
      matches: [...s.matches, match],
      currentMatch: match,
      matchPlayers: [],
      rotationEvents: [],
      gameState: { quarter: 1, isRunning: false, quarterSeconds: 0 },
      playerTimers: {},
    }))
    if (supabase) {
      supabase.from('matches').insert(match)
        .then(({ error }) => { if (error) console.error('createMatch:', error) })
    } else {
      get().saveToLocalStorage()
    }
    return match
  },

  setMatchPlayers: (matchPlayers) => {
    set({ matchPlayers })
    if (supabase) {
      supabase.from('match_players').upsert(
        matchPlayers.map(mp => ({ ...mp, player_timers: {} }))
      ).then(({ error }) => { if (error) console.error('setMatchPlayers:', error) })
    } else {
      get().saveToLocalStorage()
    }
  },

  // Selection and rotation
  selectPlayer: (playerId) => {
    const { selectedPlayerId, matchPlayers, rotationEvents, gameState, playerTimers } = get()

    if (!selectedPlayerId) {
      set({ selectedPlayerId: playerId })
      return
    }

    if (selectedPlayerId === playerId) {
      set({ selectedPlayerId: null })
      return
    }

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

    const newTimers = { ...playerTimers }
    if (newTimers[selectedPlayerId]) newTimers[selectedPlayerId] = { ...newTimers[selectedPlayerId], lastTickPosition: toPos, stintSeconds: 0 }
    if (newTimers[playerId]) newTimers[playerId] = { ...newTimers[playerId], lastTickPosition: fromPos, stintSeconds: 0 }
    set({ playerTimers: newTimers })

    if (supabase) {
      const mp1 = newMatchPlayers.find(mp => mp.player_id === selectedPlayerId)
      const mp2 = newMatchPlayers.find(mp => mp.player_id === playerId)
      Promise.all([
        supabase.from('rotation_events').insert([event1, event2]),
        supabase.from('match_players').upsert([
          { match_id: mp1.match_id, player_id: mp1.player_id, current_position: mp1.current_position, status: mp1.status, player_timers: newTimers[mp1.player_id] || {} },
          { match_id: mp2.match_id, player_id: mp2.player_id, current_position: mp2.current_position, status: mp2.status, player_timers: newTimers[mp2.player_id] || {} },
        ]),
      ]).then(([evRes, mpRes]) => {
        if (evRes.error) console.error('rotation_events insert:', evRes.error)
        if (mpRes.error) console.error('match_players upsert:', mpRes.error)
      })
    } else {
      get().saveToLocalStorage()
    }
  },

  markInjured: (playerId) => {
    const { matchPlayers } = get()
    const updated = matchPlayers.map(mp =>
      mp.player_id === playerId ? { ...mp, status: 'INJURED', current_position: 'BENCH' } : mp
    )
    set({ matchPlayers: updated })
    if (supabase) {
      const mp = updated.find(m => m.player_id === playerId)
      supabase.from('match_players')
        .update({ status: 'INJURED', current_position: 'BENCH' })
        .eq('match_id', mp.match_id).eq('player_id', playerId)
        .then(({ error }) => { if (error) console.error('markInjured:', error) })
    } else {
      get().saveToLocalStorage()
    }
  },

  returnFromInjury: (playerId) => {
    const { matchPlayers } = get()
    const updated = matchPlayers.map(mp =>
      mp.player_id === playerId ? { ...mp, status: 'ACTIVE' } : mp
    )
    set({ matchPlayers: updated })
    if (supabase) {
      const mp = updated.find(m => m.player_id === playerId)
      supabase.from('match_players')
        .update({ status: 'ACTIVE' })
        .eq('match_id', mp.match_id).eq('player_id', playerId)
        .then(({ error }) => { if (error) console.error('returnFromInjury:', error) })
    } else {
      get().saveToLocalStorage()
    }
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
        newTimers[mp.player_id] = { togSeconds: 0, stintSeconds: 0, zoneSeconds: { FORWARD: 0, MIDFIELD: 0, DEFENCE: 0, BENCH: 0 }, lastTickPosition: mp.current_position }
      }
      const timer = { ...newTimers[mp.player_id] }
      const pos = mp.current_position
      timer.zoneSeconds = { ...timer.zoneSeconds, [pos]: (timer.zoneSeconds[pos] || 0) + 1 }
      if (pos !== 'BENCH') timer.togSeconds = (timer.togSeconds || 0) + 1
      timer.stintSeconds = (timer.stintSeconds || 0) + 1
      timer.lastTickPosition = pos
      newTimers[mp.player_id] = timer
    })

    set({ gameState: { ...gameState, quarterSeconds: newQuarterSeconds }, playerTimers: newTimers })
  },

  startQuarter: () => {
    set(s => ({ gameState: { ...s.gameState, isRunning: true } }))
    if (supabase) {
      const { currentMatch, gameState } = get()
      supabase.from('matches')
        .update({ game_state: { ...gameState, isRunning: true } })
        .eq('id', currentMatch.id)
        .then(({ error }) => { if (error) console.error('startQuarter:', error) })
    } else {
      get().saveToLocalStorage()
    }
  },

  pauseQuarter: () => {
    set(s => ({ gameState: { ...s.gameState, isRunning: false } }))
    if (supabase) {
      const { currentMatch, gameState, matchPlayers, playerTimers } = get()
      const gs = { ...gameState, isRunning: false }
      Promise.all([
        supabase.from('matches').update({ game_state: gs }).eq('id', currentMatch.id),
        supabase.from('match_players').upsert(
          matchPlayers.map(mp => ({
            match_id: mp.match_id,
            player_id: mp.player_id,
            current_position: mp.current_position,
            status: mp.status,
            player_timers: playerTimers[mp.player_id] || {},
          }))
        ),
      ]).then(([gsRes, mpRes]) => {
        if (gsRes.error) console.error('pauseQuarter game_state:', gsRes.error)
        if (mpRes.error) console.error('pauseQuarter match_players:', mpRes.error)
      })
    } else {
      get().saveToLocalStorage()
    }
  },

  endQuarter: () => {
    const { gameState, playerTimers, quarterHistory, currentMatch, matchPlayers } = get()
    const report = { quarter: gameState.quarter, playerTimers: { ...playerTimers }, quarterSeconds: gameState.quarterSeconds }
    const newQuarterHistory = { ...quarterHistory, [gameState.quarter]: report }
    const newGameState = { ...gameState, isRunning: false }

    set({
      gameState: newGameState,
      quarterHistory: newQuarterHistory,
      showQuarterReport: true,
    })

    if (supabase) {
      Promise.all([
        supabase.from('matches')
          .update({ game_state: newGameState, quarter_history: newQuarterHistory })
          .eq('id', currentMatch.id),
        supabase.from('match_players').upsert(
          matchPlayers.map(mp => ({
            match_id: mp.match_id,
            player_id: mp.player_id,
            current_position: mp.current_position,
            status: mp.status,
            player_timers: playerTimers[mp.player_id] || {},
          }))
        ),
      ]).then(([gsRes, mpRes]) => {
        if (gsRes.error) console.error('endQuarter game_state:', gsRes.error)
        if (mpRes.error) console.error('endQuarter match_players:', mpRes.error)
      })
    } else {
      get().saveToLocalStorage()
    }
  },

  startNextQuarter: () => {
    const { gameState, playerTimers } = get()
    // Reset stint timers for all players at start of new quarter
    const newTimers = {}
    Object.entries(playerTimers).forEach(([id, t]) => {
      newTimers[id] = { ...t, stintSeconds: 0 }
    })
    set({
      gameState: { quarter: Math.min(gameState.quarter + 1, 4), isRunning: false, quarterSeconds: 0 },
      showQuarterReport: false,
      playerTimers: newTimers,
    })
  },

  dismissQuarterReport: () => set({ showQuarterReport: false }),

  // LocalStorage (fallback when Supabase not configured)
  saveToLocalStorage: () => {
    const { players, matches, currentMatch, matchPlayers, rotationEvents, gameState, playerTimers, quarterHistory } = get()
    try {
      localStorage.setItem('rotationiq', JSON.stringify({ players, matches, currentMatch, matchPlayers, rotationEvents, gameState, playerTimers, quarterHistory }))
    } catch (e) { console.warn('localStorage save failed', e) }
  },

  loadFromLocalStorage: () => {
    try {
      const data = localStorage.getItem('rotationiq')
      if (data) set(JSON.parse(data))
    } catch (e) { console.warn('localStorage load failed', e) }
  },

  // Primary load — fetches from Supabase, falls back to localStorage
  loadData: async () => {
    if (!supabase) {
      get().loadFromLocalStorage()
      return
    }
    try {
      const [playersRes, matchesRes] = await Promise.all([
        supabase.from('players').select('*').order('number'),
        supabase.from('matches').select('*').order('created_at', { ascending: false }),
      ])
      if (playersRes.error) throw playersRes.error
      if (matchesRes.error) throw matchesRes.error

      const players = playersRes.data || []
      const matches = matchesRes.data || []
      const currentMatch = matches[0] || null

      let matchPlayers = []
      let rotationEvents = []
      let playerTimers = {}

      if (currentMatch) {
        const [mpRes, eventsRes] = await Promise.all([
          supabase.from('match_players').select('*').eq('match_id', currentMatch.id),
          supabase.from('rotation_events').select('*').eq('match_id', currentMatch.id).order('wall_time'),
        ])
        matchPlayers = mpRes.data || []
        rotationEvents = eventsRes.data || []
        matchPlayers.forEach(mp => {
          if (mp.player_timers && Object.keys(mp.player_timers).length > 0) {
            playerTimers[mp.player_id] = mp.player_timers
          }
        })
      }

      set({
        players,
        matches,
        currentMatch,
        matchPlayers,
        rotationEvents,
        playerTimers,
        gameState: currentMatch?.game_state || { quarter: 1, isRunning: false, quarterSeconds: 0 },
        quarterHistory: currentMatch?.quarter_history || {},
      })
    } catch (e) {
      console.error('Supabase loadData failed, falling back to localStorage:', e)
      get().loadFromLocalStorage()
    }
  },
}))
