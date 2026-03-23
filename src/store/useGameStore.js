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
  playerTimers: {}, // { [playerId]: { togSeconds, stintSeconds, injuredSeconds, zoneSeconds, lastTickPosition } }
  quarterHistory: {}, // { [quarter]: { report data } }
  showQuarterReport: false,
  rotationGroups: [], // [{ id, match_id, name, player_ids, rotation_times, is_active, current_step }]
  rotationAlerts: [], // [{ groupId, groupName, playerOnId, playerOffId, step }]

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
      rotationGroups: [],
      rotationAlerts: [],
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

  // Reset clock + timers, keep same match + team
  restartMatch: () => {
    const { currentMatch, matchPlayers, rotationGroups } = get()
    if (!currentMatch) return
    const freshGameState = { quarter: 1, isRunning: false, quarterSeconds: 0 }
    const freshMatch = { ...currentMatch, game_state: freshGameState, quarter_history: {} }
    const resetMatchPlayers = matchPlayers.map(mp => ({ ...mp, player_timers: {} }))
    const resetGroups = rotationGroups.map(g => ({ ...g, current_step: 0 }))
    set({
      currentMatch: freshMatch,
      matches: get().matches.map(m => m.id === currentMatch.id ? freshMatch : m),
      gameState: freshGameState,
      playerTimers: {},
      rotationEvents: [],
      quarterHistory: {},
      showQuarterReport: false,
      matchPlayers: resetMatchPlayers,
      rotationGroups: resetGroups,
      rotationAlerts: [],
    })
    if (supabase) {
      Promise.all([
        supabase.from('matches').update({ game_state: freshGameState, quarter_history: {} }).eq('id', currentMatch.id),
        supabase.from('rotation_events').delete().eq('match_id', currentMatch.id),
        supabase.from('match_players').upsert(resetMatchPlayers),
        ...resetGroups.map(g => supabase.from('rotation_groups').update({ current_step: 0 }).eq('id', g.id)),
      ]).then(results => {
        results.forEach(r => { if (r?.error) console.error('restartMatch:', r.error) })
      })
    } else {
      get().saveToLocalStorage()
    }
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
    const { selectedPlayerId, matchPlayers, rotationEvents, gameState, playerTimers, rotationGroups } = get()

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

    // Swap both zone (current_position) AND named slot (named_position)
    const newMatchPlayers = matchPlayers.map(mp => {
      if (mp.player_id === selectedPlayerId) return { ...mp, current_position: toPos, named_position: player2Mp.named_position }
      if (mp.player_id === playerId) return { ...mp, current_position: fromPos, named_position: player1Mp.named_position }
      return mp
    })

    // If either swapped player is in a rotation group, replace them with the other player
    const newRotationGroups = rotationGroups.map(g => {
      const idx = g.player_ids.indexOf(selectedPlayerId)
      if (idx !== -1) {
        const newIds = [...g.player_ids]
        newIds[idx] = playerId
        return { ...g, player_ids: newIds }
      }
      const idx2 = g.player_ids.indexOf(playerId)
      if (idx2 !== -1) {
        const newIds = [...g.player_ids]
        newIds[idx2] = selectedPlayerId
        return { ...g, player_ids: newIds }
      }
      return g
    })

    set({
      matchPlayers: newMatchPlayers,
      rotationEvents: [...rotationEvents, event1, event2],
      rotationGroups: newRotationGroups,
      selectedPlayerId: null,
    })

    const newTimers = { ...playerTimers }
    if (newTimers[selectedPlayerId]) newTimers[selectedPlayerId] = { ...newTimers[selectedPlayerId], lastTickPosition: toPos, stintSeconds: 0 }
    if (newTimers[playerId]) newTimers[playerId] = { ...newTimers[playerId], lastTickPosition: fromPos, stintSeconds: 0 }
    set({ playerTimers: newTimers })

    if (supabase) {
      const mp1 = newMatchPlayers.find(mp => mp.player_id === selectedPlayerId)
      const mp2 = newMatchPlayers.find(mp => mp.player_id === playerId)
      const changedGroups = newRotationGroups.filter((g, i) => g.player_ids !== rotationGroups[i]?.player_ids)
      Promise.all([
        supabase.from('rotation_events').insert([event1, event2]),
        supabase.from('match_players').upsert([
          { match_id: mp1.match_id, player_id: mp1.player_id, current_position: mp1.current_position, named_position: mp1.named_position, status: mp1.status, player_timers: newTimers[mp1.player_id] || {} },
          { match_id: mp2.match_id, player_id: mp2.player_id, current_position: mp2.current_position, named_position: mp2.named_position, status: mp2.status, player_timers: newTimers[mp2.player_id] || {} },
        ]),
        ...changedGroups.map(g => supabase.from('rotation_groups').update({ player_ids: g.player_ids }).eq('id', g.id)),
      ]).then(results => {
        if (results[0]?.error) console.error('rotation_events insert:', results[0].error)
        if (results[1]?.error) console.error('match_players upsert:', results[1].error)
      })
    } else {
      get().saveToLocalStorage()
    }
  },

  markInjured: (playerId) => {
    const { matchPlayers, playerTimers } = get()
    const updated = matchPlayers.map(mp =>
      mp.player_id === playerId ? { ...mp, status: 'INJURED', current_position: 'BENCH' } : mp
    )
    const newTimers = { ...playerTimers }
    if (newTimers[playerId]) {
      newTimers[playerId] = { ...newTimers[playerId], injuredSeconds: 0, stintSeconds: 0 }
    } else {
      newTimers[playerId] = { togSeconds: 0, stintSeconds: 0, injuredSeconds: 0, zoneSeconds: { FORWARD: 0, MIDFIELD: 0, DEFENCE: 0, BENCH: 0 }, lastTickPosition: 'BENCH' }
    }
    set({ matchPlayers: updated, playerTimers: newTimers, selectedPlayerId: null })
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

  // Rotation groups
  addRotationGroup: (group) => {
    const newGroup = { ...group, id: `rg_${Date.now()}`, current_step: 0 }
    set(s => ({ rotationGroups: [...s.rotationGroups, newGroup] }))
    if (supabase) {
      supabase.from('rotation_groups').insert(newGroup)
        .then(({ error }) => { if (error) console.error('addRotationGroup:', error) })
    } else {
      get().saveToLocalStorage()
    }
  },

  updateRotationGroup: (id, data) => {
    set(s => ({ rotationGroups: s.rotationGroups.map(g => g.id === id ? { ...g, ...data } : g) }))
    if (supabase) {
      supabase.from('rotation_groups').update(data).eq('id', id)
        .then(({ error }) => { if (error) console.error('updateRotationGroup:', error) })
    } else {
      get().saveToLocalStorage()
    }
  },

  deleteRotationGroup: (id) => {
    set(s => ({
      rotationGroups: s.rotationGroups.filter(g => g.id !== id),
      rotationAlerts: s.rotationAlerts.filter(a => a.groupId !== id),
    }))
    if (supabase) {
      supabase.from('rotation_groups').delete().eq('id', id)
        .then(({ error }) => { if (error) console.error('deleteRotationGroup:', error) })
    } else {
      get().saveToLocalStorage()
    }
  },

  dismissRotationAlert: (groupId) => {
    set(s => ({ rotationAlerts: s.rotationAlerts.filter(a => a.groupId !== groupId) }))
  },

  // Game clock
  tickSecond: () => {
    const { gameState, matchPlayers, playerTimers, rotationGroups, rotationAlerts } = get()
    if (!gameState.isRunning) return

    const newQuarterSeconds = gameState.quarterSeconds + 1
    const newTimers = { ...playerTimers }

    matchPlayers.forEach(mp => {
      if (mp.status === 'INJURED') {
        if (!newTimers[mp.player_id]) {
          newTimers[mp.player_id] = { togSeconds: 0, stintSeconds: 0, injuredSeconds: 0, zoneSeconds: { FORWARD: 0, MIDFIELD: 0, DEFENCE: 0, BENCH: 0 }, lastTickPosition: 'BENCH' }
        }
        const timer = { ...newTimers[mp.player_id] }
        timer.injuredSeconds = (timer.injuredSeconds || 0) + 1
        newTimers[mp.player_id] = timer
        return
      }
      if (!newTimers[mp.player_id]) {
        newTimers[mp.player_id] = { togSeconds: 0, stintSeconds: 0, injuredSeconds: 0, zoneSeconds: { FORWARD: 0, MIDFIELD: 0, DEFENCE: 0, BENCH: 0 }, lastTickPosition: mp.current_position }
      }
      const timer = { ...newTimers[mp.player_id] }
      const pos = mp.current_position
      timer.zoneSeconds = { ...timer.zoneSeconds, [pos]: (timer.zoneSeconds[pos] || 0) + 1 }
      if (pos !== 'BENCH') timer.togSeconds = (timer.togSeconds || 0) + 1
      timer.stintSeconds = (timer.stintSeconds || 0) + 1
      timer.lastTickPosition = pos
      newTimers[mp.player_id] = timer
    })

    // Check rotation group timers
    const newAlerts = [...rotationAlerts]
    const updatedGroups = rotationGroups.map(g => {
      if (!g.is_active) return g
      const nextTime = g.rotation_times[g.current_step]
      if (nextTime === undefined || newQuarterSeconds !== nextTime) return g
      // Don't double-alert if one is already pending for this group
      if (newAlerts.find(a => a.groupId === g.id)) return g
      const len = g.player_ids.length
      const playerOnId = g.player_ids[g.current_step % len]
      const playerOffId = g.player_ids[(g.current_step + 1) % len]
      newAlerts.push({ groupId: g.id, groupName: g.name, playerOnId, playerOffId, step: g.current_step })
      return { ...g, current_step: g.current_step + 1 }
    })

    set({
      gameState: { ...gameState, quarterSeconds: newQuarterSeconds },
      playerTimers: newTimers,
      rotationGroups: updatedGroups,
      rotationAlerts: newAlerts,
    })
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
    const { gameState, playerTimers, rotationGroups } = get()
    // Reset stint timers and rotation steps for new quarter
    const newTimers = {}
    Object.entries(playerTimers).forEach(([id, t]) => {
      newTimers[id] = { ...t, stintSeconds: 0 }
    })
    const resetGroups = rotationGroups.map(g => ({ ...g, current_step: 0 }))
    set({
      gameState: { quarter: Math.min(gameState.quarter + 1, 4), isRunning: false, quarterSeconds: 0 },
      showQuarterReport: false,
      playerTimers: newTimers,
      rotationGroups: resetGroups,
      rotationAlerts: [],
    })
    if (supabase) {
      resetGroups.forEach(g => {
        supabase.from('rotation_groups').update({ current_step: 0 }).eq('id', g.id)
          .then(({ error }) => { if (error) console.error('startNextQuarter rotation_groups:', error) })
      })
    }
  },

  dismissQuarterReport: () => set({ showQuarterReport: false }),

  // LocalStorage (fallback when Supabase not configured)
  saveToLocalStorage: () => {
    const { players, matches, currentMatch, matchPlayers, rotationEvents, gameState, playerTimers, quarterHistory, rotationGroups } = get()
    try {
      localStorage.setItem('rotationiq', JSON.stringify({ players, matches, currentMatch, matchPlayers, rotationEvents, gameState, playerTimers, quarterHistory, rotationGroups }))
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
      let rotationGroups = []

      if (currentMatch) {
        const [mpRes, eventsRes, rgRes] = await Promise.all([
          supabase.from('match_players').select('*').eq('match_id', currentMatch.id),
          supabase.from('rotation_events').select('*').eq('match_id', currentMatch.id).order('wall_time'),
          supabase.from('rotation_groups').select('*').eq('match_id', currentMatch.id),
        ])
        matchPlayers = mpRes.data || []
        rotationEvents = eventsRes.data || []
        rotationGroups = rgRes.data || []
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
        rotationGroups,
        rotationAlerts: [],
        gameState: currentMatch?.game_state || { quarter: 1, isRunning: false, quarterSeconds: 0 },
        quarterHistory: currentMatch?.quarter_history || {},
      })
    } catch (e) {
      console.error('Supabase loadData failed, falling back to localStorage:', e)
      get().loadFromLocalStorage()
    }
  },
}))
