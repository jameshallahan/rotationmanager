import { create } from 'zustand'
import { supabase } from '../lib/supabase'

// Catches both synchronous throws and async rejections from Supabase calls
const sb = (fn) => {
  try {
    const p = typeof fn === 'function' ? fn() : fn
    p?.catch?.(err => console.warn('Supabase sync error:', err))
  } catch (err) {
    console.warn('Supabase sync error:', err)
  }
}

export const useGameStore = create((set, get) => ({
  // State
  players: [],
  matches: [],
  currentMatch: null,
  matchPlayers: [],
  rotationEvents: [],
  gameState: { quarter: 1, isRunning: false, quarterSeconds: 0 },
  selectedPlayerId: null,
  playerTimers: {},
  quarterHistory: {},
  showQuarterReport: false,

  // Player CRUD
  addPlayer: (player) => {
    const id = crypto.randomUUID()
    const newPlayer = { ...player, id }
    set(s => ({ players: [...s.players, newPlayer] }))
    get().saveToLocalStorage()
    if (supabase) {
      sb(() => supabase.from('players').insert({
        id,
        first_name: player.first_name,
        last_name: player.last_name,
        number: player.number,
        points: player.points || null,
        primary_position: player.primary_position,
        secondary_positions: player.secondary_positions || [],
        active: player.active !== false,
      }))
    }
  },

  updatePlayer: (id, data) => {
    set(s => ({ players: s.players.map(p => p.id === id ? { ...p, ...data } : p) }))
    get().saveToLocalStorage()
    if (supabase) {
      sb(() => supabase.from('players').update({
        first_name: data.first_name,
        last_name: data.last_name,
        number: data.number,
        points: data.points || null,
        primary_position: data.primary_position,
        secondary_positions: data.secondary_positions || [],
        active: data.active !== false,
      }).eq('id', id))
    }
  },

  deletePlayer: (id) => {
    set(s => ({ players: s.players.filter(p => p.id !== id) }))
    get().saveToLocalStorage()
    if (supabase) sb(() => supabase.from('players').delete().eq('id', id))
  },

  // Match management
  createMatch: (data) => {
    const id = crypto.randomUUID()
    const match = { ...data, id, created_at: new Date().toISOString() }
    set(s => ({
      matches: [...s.matches, match],
      currentMatch: match,
      matchPlayers: [],
      rotationEvents: [],
      gameState: { quarter: 1, isRunning: false, quarterSeconds: 0 },
      playerTimers: {},
      quarterHistory: {},
    }))
    get().saveToLocalStorage()
    if (supabase) {
      sb(() => supabase.from('matches').insert({
        id,
        opponent: data.opponent,
        date: data.date,
        venue: data.venue || null,
      }).then(() => {
        sb(() => supabase.from('game_state').insert({
          match_id: id,
          quarter: 1,
          is_running: false,
          quarter_seconds: 0,
        }))
      }))
    }
    return match
  },

  setMatchPlayers: (matchPlayers) => {
    // Ensure all match_player IDs are proper UUIDs
    const normalized = matchPlayers.map(mp => ({
      ...mp,
      id: mp.id && !mp.id.startsWith('mp_') ? mp.id : crypto.randomUUID(),
    }))
    set({ matchPlayers: normalized })
    get().saveToLocalStorage()
    if (supabase && normalized.length > 0) {
      const matchId = normalized[0].match_id
      sb(() => supabase.from('match_players').delete().eq('match_id', matchId).then(() => {
        sb(() => supabase.from('match_players').insert(
          normalized.map(mp => ({
            id: mp.id,
            match_id: mp.match_id,
            player_id: mp.player_id,
            current_position: mp.current_position,
            starting_position: mp.starting_position,
            status: mp.status || 'ACTIVE',
          }))
        ))
      }))
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
      id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
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
    if (newTimers[selectedPlayerId]) newTimers[selectedPlayerId] = { ...newTimers[selectedPlayerId], lastTickPosition: toPos }
    if (newTimers[playerId]) newTimers[playerId] = { ...newTimers[playerId], lastTickPosition: fromPos }
    set({ playerTimers: newTimers })

    get().saveToLocalStorage()

    if (supabase) {
      sb(() => supabase.from('match_players').update({ current_position: toPos }).eq('id', player1Mp.id))
      sb(() => supabase.from('match_players').update({ current_position: fromPos }).eq('id', player2Mp.id))
      sb(() => supabase.from('rotation_events').insert([
        { id: event1.id, match_id: event1.match_id, player_id: event1.player_id, event_type: event1.event_type, from_position: event1.from_position, to_position: event1.to_position, quarter: event1.quarter, quarter_time_seconds: event1.quarter_time_seconds, wall_time: event1.wall_time },
        { id: event2.id, match_id: event2.match_id, player_id: event2.player_id, event_type: event2.event_type, from_position: event2.from_position, to_position: event2.to_position, quarter: event2.quarter, quarter_time_seconds: event2.quarter_time_seconds, wall_time: event2.wall_time },
      ]))
    }
  },

  markInjured: (playerId) => {
    const { matchPlayers } = get()
    const mp = matchPlayers.find(m => m.player_id === playerId)
    set({
      matchPlayers: matchPlayers.map(m =>
        m.player_id === playerId ? { ...m, status: 'INJURED', current_position: 'BENCH' } : m
      )
    })
    get().saveToLocalStorage()
    if (supabase && mp) sb(() => supabase.from('match_players').update({ status: 'INJURED', current_position: 'BENCH' }).eq('id', mp.id))
  },

  returnFromInjury: (playerId) => {
    const { matchPlayers } = get()
    const mp = matchPlayers.find(m => m.player_id === playerId)
    set({
      matchPlayers: matchPlayers.map(m =>
        m.player_id === playerId ? { ...m, status: 'ACTIVE' } : m
      )
    })
    get().saveToLocalStorage()
    if (supabase && mp) sb(() => supabase.from('match_players').update({ status: 'ACTIVE' }).eq('id', mp.id))
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
    if (supabase) {
      const { currentMatch } = get()
      if (currentMatch) sb(() => supabase.from('game_state').update({ is_running: true, updated_at: new Date().toISOString() }).eq('match_id', currentMatch.id))
    }
  },

  pauseQuarter: () => {
    set(s => ({ gameState: { ...s.gameState, isRunning: false } }))
    get().saveToLocalStorage()
    get().syncTimersAndState()
  },

  endQuarter: () => {
    const { gameState, playerTimers, quarterHistory, currentMatch } = get()
    const report = { quarter: gameState.quarter, playerTimers: { ...playerTimers }, quarterSeconds: gameState.quarterSeconds }
    set(s => ({
      gameState: { ...s.gameState, isRunning: false },
      quarterHistory: { ...quarterHistory, [gameState.quarter]: report },
      showQuarterReport: true,
    }))
    get().saveToLocalStorage()

    if (supabase && currentMatch) {
      sb(() => supabase.from('game_state').update({
        is_running: false,
        quarter: gameState.quarter,
        quarter_seconds: gameState.quarterSeconds,
        updated_at: new Date().toISOString(),
      }).eq('match_id', currentMatch.id))
      sb(() => supabase.from('quarter_history').upsert({
        match_id: currentMatch.id,
        quarter: gameState.quarter,
        quarter_seconds: gameState.quarterSeconds,
        player_timers: playerTimers,
      }, { onConflict: 'match_id,quarter' }))
      get().syncTimers()
    }
  },

  startNextQuarter: () => {
    const { gameState, currentMatch } = get()
    const nextQuarter = Math.min(gameState.quarter + 1, 4)
    set({
      gameState: { quarter: nextQuarter, isRunning: false, quarterSeconds: 0 },
      showQuarterReport: false,
    })
    get().saveToLocalStorage()
    if (supabase && currentMatch) {
      sb(() => supabase.from('game_state').update({
        quarter: nextQuarter,
        is_running: false,
        quarter_seconds: 0,
        updated_at: new Date().toISOString(),
      }).eq('match_id', currentMatch.id))
    }
  },

  dismissQuarterReport: () => set({ showQuarterReport: false }),

  // Sync helpers
  syncTimers: () => {
    const { playerTimers, currentMatch } = get()
    if (!supabase || !currentMatch) return
    const rows = Object.entries(playerTimers).map(([playerId, timer]) => ({
      match_id: currentMatch.id,
      player_id: playerId,
      tog_seconds: timer.togSeconds || 0,
      zone_seconds: timer.zoneSeconds || { FORWARD: 0, MIDFIELD: 0, DEFENCE: 0, BENCH: 0 },
      last_tick_position: timer.lastTickPosition || null,
      updated_at: new Date().toISOString(),
    }))
    if (rows.length > 0) sb(() => supabase.from('player_timers').upsert(rows, { onConflict: 'match_id,player_id' }))
  },

  syncTimersAndState: () => {
    const { gameState, currentMatch } = get()
    get().syncTimers()
    if (supabase && currentMatch) {
      sb(() => supabase.from('game_state').update({
        is_running: false,
        quarter: gameState.quarter,
        quarter_seconds: gameState.quarterSeconds,
        updated_at: new Date().toISOString(),
      }).eq('match_id', currentMatch.id))
    }
  },

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

  // Supabase load
  loadFromSupabase: async () => {
    if (!supabase) {
      get().loadFromLocalStorage()
      return
    }

    // Get the current match ID from localStorage to resume in-progress match
    let currentMatchId = null
    try {
      const stored = localStorage.getItem('rotationiq')
      if (stored) {
        const parsed = JSON.parse(stored)
        currentMatchId = parsed?.currentMatch?.id || null
      }
    } catch (e) {}

    try {
      const [playersRes, matchesRes] = await Promise.all([
        supabase.from('players').select('*').order('number'),
        supabase.from('matches').select('*').order('created_at', { ascending: false }),
      ])

      if (playersRes.error) throw playersRes.error
      if (matchesRes.error) throw matchesRes.error

      let players = playersRes.data
      let matches = matchesRes.data

      // Migrate any players that exist in localStorage but not in Supabase
      let localState = null
      try {
        const stored = localStorage.getItem('rotationiq')
        if (stored) localState = JSON.parse(stored)
      } catch (e) {}

      if (players.length === 0 && localState?.players?.length > 0) {
        // Re-ID any players that have non-UUID IDs (old Date.now() style)
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        const migrated = localState.players.map(p => ({
          ...p,
          id: UUID_RE.test(p.id) ? p.id : crypto.randomUUID(),
        }))
        sb(() => supabase.from('players').insert(
          migrated.map(p => ({
            id: p.id,
            first_name: p.first_name,
            last_name: p.last_name,
            number: p.number,
            points: p.points || null,
            primary_position: p.primary_position,
            secondary_positions: p.secondary_positions || [],
            active: p.active !== false,
          }))
        ))
        players = migrated
      }

      if (!currentMatchId) {
        set({ players, matches })
        return
      }

      const [mpRes, eventsRes, timersRes, gsRes, qhRes] = await Promise.all([
        supabase.from('match_players').select('*').eq('match_id', currentMatchId),
        supabase.from('rotation_events').select('*').eq('match_id', currentMatchId).order('wall_time'),
        supabase.from('player_timers').select('*').eq('match_id', currentMatchId),
        supabase.from('game_state').select('*').eq('match_id', currentMatchId).single(),
        supabase.from('quarter_history').select('*').eq('match_id', currentMatchId).order('quarter'),
      ])

      const matchPlayers = mpRes.data || []
      const rotationEvents = eventsRes.data || []

      const playerTimers = {}
      ;(timersRes.data || []).forEach(t => {
        playerTimers[t.player_id] = {
          togSeconds: t.tog_seconds,
          zoneSeconds: t.zone_seconds,
          lastTickPosition: t.last_tick_position,
        }
      })

      const gameState = gsRes.data ? {
        quarter: gsRes.data.quarter,
        isRunning: false, // always start paused on load
        quarterSeconds: gsRes.data.quarter_seconds,
      } : { quarter: 1, isRunning: false, quarterSeconds: 0 }

      const quarterHistory = {}
      ;(qhRes.data || []).forEach(qh => {
        quarterHistory[qh.quarter] = {
          quarter: qh.quarter,
          quarterSeconds: qh.quarter_seconds,
          playerTimers: qh.player_timers,
        }
      })

      const currentMatch = matches.find(m => m.id === currentMatchId) || null

      set({ players, matches, currentMatch, matchPlayers, rotationEvents, playerTimers, gameState, quarterHistory })
      get().saveToLocalStorage()
    } catch (err) {
      console.warn('Supabase load failed, falling back to localStorage:', err)
      get().loadFromLocalStorage()
    }
  },
}))
