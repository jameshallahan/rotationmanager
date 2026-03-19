import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Check, Plus, Minus } from 'lucide-react'
import { useGameStore } from '../store/useGameStore'

// Named positions per zone — 2 rows × 3 cols each
const ZONE_POSITIONS = {
  DEFENCE: [
    { id: 'DEF_LBP', label: 'LBP' }, { id: 'DEF_FB',  label: 'FB'  }, { id: 'DEF_RBP', label: 'RBP' },
    { id: 'DEF_LHB', label: 'LHB' }, { id: 'DEF_CHB', label: 'CHB' }, { id: 'DEF_RHB', label: 'RHB' },
  ],
  MIDFIELD: [
    { id: 'MID_LW', label: 'LW' }, { id: 'MID_C',  label: 'C'  }, { id: 'MID_RW', label: 'RW' },
    { id: 'MID_RR', label: 'RR' }, { id: 'MID_RK', label: 'RK' }, { id: 'MID_RV', label: 'RV' },
  ],
  FORWARD: [
    { id: 'FWD_LHF', label: 'LHF' }, { id: 'FWD_CHF', label: 'CHF' }, { id: 'FWD_RHF', label: 'RHF' },
    { id: 'FWD_LFP', label: 'LFP' }, { id: 'FWD_FF',  label: 'FF'  }, { id: 'FWD_RFP', label: 'RFP' },
  ],
}

// Map named position → zone for game store
const POS_TO_ZONE = {
  DEF_LBP: 'DEFENCE', DEF_FB: 'DEFENCE', DEF_RBP: 'DEFENCE',
  DEF_LHB: 'DEFENCE', DEF_CHB: 'DEFENCE', DEF_RHB: 'DEFENCE',
  MID_LW: 'MIDFIELD', MID_C: 'MIDFIELD', MID_RW: 'MIDFIELD',
  MID_RR: 'MIDFIELD', MID_RK: 'MIDFIELD', MID_RV: 'MIDFIELD',
  FWD_LHF: 'FORWARD', FWD_CHF: 'FORWARD', FWD_RHF: 'FORWARD',
  FWD_LFP: 'FORWARD', FWD_FF: 'FORWARD', FWD_RFP: 'FORWARD',
}

const CHIP_BG   = 'rgba(18, 22, 30, 0.88)'
const CHIP_RING = 'rgba(255,255,255,0.16)'

// Filled position slot — horizontal card
function FilledSlot({ player, posLabel, onRemove }) {
  const initial = player.first_name.charAt(0).toUpperCase()
  return (
    <button
      onClick={e => { e.stopPropagation(); onRemove(player.id) }}
      className="w-full flex items-center gap-2 rounded-lg transition-all active:scale-95"
      style={{
        background: CHIP_BG,
        border: `1px solid ${CHIP_RING}`,
        padding: '5px 7px',
        height: 44,
        boxShadow: '0 2px 6px rgba(0,0,0,0.55)',
      }}
    >
      {/* Jersey number */}
      <div className="flex-shrink-0 flex items-center justify-center rounded"
        style={{ background: '#CC0000', minWidth: 28, height: 28, padding: '0 4px' }}>
        <span className="font-condensed font-black text-white leading-none" style={{ fontSize: 15 }}>
          {player.number}
        </span>
      </div>
      {/* Name + position label */}
      <div className="flex flex-col items-start min-w-0 flex-1">
        <span className="font-condensed font-bold text-white uppercase leading-none w-full truncate" style={{ fontSize: 13 }}>
          {initial}.{player.last_name}
        </span>
        <span className="font-condensed font-bold text-gray-400 leading-none" style={{ fontSize: 10 }}>
          {posLabel}
        </span>
      </div>
    </button>
  )
}

// Empty position slot — shows the position abbreviation
function EmptySlot({ label, canDrop, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex flex-col items-center justify-center rounded-lg transition-all"
      style={{
        height: 44,
        border: `1.5px dashed ${canDrop ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.18)'}`,
        background: canDrop ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.12)',
        cursor: canDrop ? 'pointer' : 'default',
      }}
    >
      <span className="font-condensed font-black text-gray-500 uppercase tracking-wide" style={{ fontSize: 11 }}>
        {label}
      </span>
    </button>
  )
}

export default function PreMatchSetup() {
  const navigate        = useNavigate()
  const [searchParams]  = useSearchParams()
  const isEditMode      = searchParams.get('edit') === 'true'

  const players         = useGameStore(s => s.players)
  const currentMatch    = useGameStore(s => s.currentMatch)
  const existingMatchPlayers = useGameStore(s => s.matchPlayers)
  const createMatch     = useGameStore(s => s.createMatch)
  const setMatchPlayers = useGameStore(s => s.setMatchPlayers)

  const [step, setStep] = useState(isEditMode ? 2 : 1)
  const [matchData, setMatchData] = useState(() => {
    if (isEditMode && currentMatch) {
      return {
        opponent:   currentMatch.opponent || '',
        date:       currentMatch.date || new Date().toISOString().split('T')[0],
        venue:      currentMatch.venue || '',
        bench_size: currentMatch.bench_size || 4,
      }
    }
    return { opponent: '', date: new Date().toISOString().split('T')[0], venue: '', bench_size: 4 }
  })
  // assignments: { playerId: positionId | 'BENCH' }
  const [assignments, setAssignments] = useState(() => {
    if (!isEditMode || !currentMatch) return {}
    // Reconstruct assignments: distribute zone players to named positions in order
    const newAssignments = {}
    const zoneQueues = { DEFENCE: [], MIDFIELD: [], FORWARD: [], BENCH: [] }
    existingMatchPlayers.forEach(mp => {
      const bucket = zoneQueues[mp.current_position]
      if (bucket) bucket.push(mp.player_id)
    })
    ;['DEFENCE', 'MIDFIELD', 'FORWARD'].forEach(zone => {
      const positions = ZONE_POSITIONS[zone]
      zoneQueues[zone].forEach((playerId, i) => {
        if (positions[i]) newAssignments[playerId] = positions[i].id
      })
    })
    zoneQueues.BENCH.forEach(playerId => { newAssignments[playerId] = 'BENCH' })
    return newAssignments
  })
  const [selectedId, setSelectedId] = useState(null)

  const activePlayers = players.filter(p => p.active).sort((a, b) => a.number - b.number)
  const unassigned    = activePlayers.filter(p => !assignments[p.id])

  // reverse map: positionId → playerId
  const posToPlayer = {}
  Object.entries(assignments).forEach(([pid, posId]) => { posToPlayer[posId] = pid })

  const benchPlayers  = activePlayers.filter(p => assignments[p.id] === 'BENCH')
  const totalAssigned = Object.keys(assignments).length
  const totalNeeded   = 18 + matchData.bench_size
  const canStart      = totalAssigned === totalNeeded

  const selectedPlayer = activePlayers.find(p => p.id === selectedId)

  const handleSelectFromList = id => setSelectedId(id === selectedId ? null : id)

  const handleTapSlot = posId => {
    if (!selectedId) return
    if (posToPlayer[posId] && posToPlayer[posId] !== selectedId) return // slot taken
    setAssignments(prev => ({ ...prev, [selectedId]: posId }))
    const remaining = unassigned.filter(p => p.id !== selectedId)
    setSelectedId(remaining[0]?.id ?? null)
  }

  const handleTapBench = () => {
    if (!selectedId) return
    if (benchPlayers.length >= matchData.bench_size) return
    setAssignments(prev => ({ ...prev, [selectedId]: 'BENCH' }))
    const remaining = unassigned.filter(p => p.id !== selectedId)
    setSelectedId(remaining[0]?.id ?? null)
  }

  const handleRemove = id => {
    setAssignments(prev => { const n = { ...prev }; delete n[id]; return n })
    setSelectedId(id)
  }

  const handleStart = () => {
    if (!canStart) return
    if (isEditMode && currentMatch) {
      setMatchPlayers(
        Object.entries(assignments).map(([player_id, posId]) => ({
          player_id, match_id: currentMatch.id,
          current_position: posId === 'BENCH' ? 'BENCH' : POS_TO_ZONE[posId],
          status: 'ACTIVE',
        }))
      )
    } else {
      const match = createMatch(matchData)
      setMatchPlayers(
        Object.entries(assignments).map(([player_id, posId]) => ({
          player_id, match_id: match.id,
          current_position: posId === 'BENCH' ? 'BENCH' : POS_TO_ZONE[posId],
          status: 'ACTIVE',
        }))
      )
    }
    navigate('/match/live')
  }

  // Render a 3×2 zone grid inside the oval
  const renderZone = (zoneName, padH, padTop, padBottom) => {
    const positions = ZONE_POSITIONS[zoneName]
    return (
      <div
        className="flex flex-col justify-center"
        style={{ flex: 1, padding: `${padTop} ${padH} ${padBottom}` }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
          {positions.map(pos => {
            const occupantId = posToPlayer[pos.id]
            const occupant   = occupantId ? activePlayers.find(p => p.id === occupantId) : null
            if (occupant) {
              return <FilledSlot key={pos.id} player={occupant} posLabel={pos.label} onRemove={handleRemove} />
            }
            return (
              <EmptySlot
                key={pos.id}
                label={pos.label}
                canDrop={!!selectedId}
                onClick={() => handleTapSlot(pos.id)}
              />
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-sharks-dark">

      {/* Header */}
      <div className="flex items-center justify-between px-6 h-[72px] bg-sharks-surface border-b border-sharks-border flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => isEditMode ? navigate('/match/live') : step === 1 ? navigate('/') : setStep(1)}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-sharks-surface2 transition-colors">
            <ChevronLeft size={20} className="text-gray-400" />
          </button>
          <img src="/sharks-logo.png" alt="" className="h-10 w-auto" onError={e => { e.target.style.display = 'none' }} />
          <div className="h-6 w-px bg-sharks-border" />
          <div>
            <h1 className="font-condensed font-black text-white text-2xl uppercase tracking-wide leading-none">
              {isEditMode ? 'Change Team' : step === 1 ? 'New Match' : 'Team Selection'}
            </h1>
            <p className="font-condensed text-gray-500 text-xs mt-0.5">
              {step === 1
                ? `Step 1 of 2 · ${18 + matchData.bench_size} players needed`
                : `${totalAssigned} / ${totalNeeded} placed`}
            </p>
          </div>
        </div>
        {step === 2 && (
          <button onClick={handleStart} disabled={!canStart}
            className={`h-11 px-5 font-condensed font-bold text-sm uppercase tracking-wide rounded-xl flex items-center gap-2 transition-all ${
              canStart ? 'bg-sharks-red hover:bg-red-700 text-white' : 'bg-sharks-surface2 text-gray-600 cursor-not-allowed'
            }`}>
            <Check size={16} /> {isEditMode ? 'Save Team' : 'Start Match'}
          </button>
        )}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="flex-1 overflow-auto flex items-center justify-center p-6">
          <div className="w-full max-w-sm flex flex-col gap-5">
            <div>
              <label className="font-condensed text-xs text-gray-400 uppercase tracking-wider block mb-1.5">Opponent</label>
              <input autoFocus
                className="w-full bg-sharks-surface border border-sharks-border text-white font-barlow rounded-xl px-4 h-12 focus:outline-none focus:border-sharks-red transition-colors placeholder:text-gray-600"
                placeholder="e.g. East Fremantle FC"
                value={matchData.opponent}
                onChange={e => setMatchData(d => ({ ...d, opponent: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && matchData.opponent.trim() && setStep(2)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-condensed text-xs text-gray-400 uppercase tracking-wider block mb-1.5">Date</label>
                <input type="date"
                  className="w-full bg-sharks-surface border border-sharks-border text-white font-barlow rounded-xl px-4 h-12 focus:outline-none focus:border-sharks-red transition-colors"
                  value={matchData.date} onChange={e => setMatchData(d => ({ ...d, date: e.target.value }))} />
              </div>
              <div>
                <label className="font-condensed text-xs text-gray-400 uppercase tracking-wider block mb-1.5">Venue</label>
                <input
                  className="w-full bg-sharks-surface border border-sharks-border text-white font-barlow rounded-xl px-4 h-12 focus:outline-none focus:border-sharks-red transition-colors placeholder:text-gray-600"
                  placeholder="Ground name"
                  value={matchData.venue} onChange={e => setMatchData(d => ({ ...d, venue: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="font-condensed text-xs text-gray-400 uppercase tracking-wider block mb-1.5">Interchange</label>
              <div className="flex items-center bg-sharks-surface border border-sharks-border rounded-xl overflow-hidden h-14">
                <button onClick={() => setMatchData(d => ({ ...d, bench_size: Math.max(4, d.bench_size - 1) }))}
                  className="w-14 h-full flex items-center justify-center hover:bg-sharks-surface2 transition-colors border-r border-sharks-border">
                  <Minus size={18} className="text-gray-400" />
                </button>
                <div className="flex-1 flex flex-col items-center justify-center">
                  <span className="font-condensed font-black text-white text-3xl leading-none">{matchData.bench_size}</span>
                  <span className="font-condensed text-gray-500 text-xs">on interchange</span>
                </div>
                <button onClick={() => setMatchData(d => ({ ...d, bench_size: Math.min(10, d.bench_size + 1) }))}
                  className="w-14 h-full flex items-center justify-center hover:bg-sharks-surface2 transition-colors border-l border-sharks-border">
                  <Plus size={18} className="text-gray-400" />
                </button>
              </div>
              <p className="font-condensed text-xs text-gray-600 mt-1.5 text-center">
                {18 + matchData.bench_size} total players · 4–10 allowed
              </p>
            </div>
            <button onClick={() => matchData.opponent.trim() && setStep(2)} disabled={!matchData.opponent.trim()}
              className={`w-full h-12 rounded-xl font-condensed font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                matchData.opponent.trim() ? 'bg-sharks-red hover:bg-red-700 text-white' : 'bg-sharks-surface2 text-gray-600 cursor-not-allowed'
              }`}>
              Select Team <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="flex-1 flex overflow-hidden">

          {/* Left: unassigned players */}
          <div className="w-36 flex-shrink-0 border-r border-sharks-border flex flex-col bg-sharks-surface">
            <div className="px-3 py-2 border-b border-sharks-border flex-shrink-0">
              <p className="font-condensed text-[10px] text-gray-500 uppercase tracking-widest">
                Unplaced · {unassigned.length}
              </p>
            </div>
            <div className="flex-1 overflow-auto">
              {unassigned.length === 0 ? (
                <div className="flex items-center justify-center h-16">
                  <p className="font-condensed text-xs text-gray-600">All placed</p>
                </div>
              ) : unassigned.map(player => (
                <button key={player.id} onClick={() => handleSelectFromList(player.id)}
                  className="w-full flex items-center gap-2 px-2.5 py-2 border-b transition-all text-left"
                  style={{
                    borderBottomColor: 'rgba(255,255,255,0.05)',
                    borderLeft: `3px solid ${selectedId === player.id ? '#CC0000' : 'transparent'}`,
                    background: selectedId === player.id ? 'rgba(204,0,0,0.1)' : 'transparent',
                  }}>
                  <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ background: '#CC0000' }}>
                    <span className="font-condensed font-black text-white text-sm">{player.number}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-condensed font-bold text-white text-sm uppercase leading-tight truncate">
                      {player.last_name}
                    </p>
                    <p className="font-condensed text-[10px] font-bold text-gray-400 leading-none">
                      {player.first_name.charAt(0)}.
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right: field */}
          <div className="flex-1 overflow-hidden flex flex-col items-center py-3 px-3 gap-2">

            {/* Hint */}
            <div className="flex-shrink-0 h-5 flex items-center justify-center w-full">
              {selectedPlayer ? (
                <p className="font-condensed text-xs text-gray-400 text-center">
                  Placing <span className="font-black text-white">#{selectedPlayer.number} {selectedPlayer.first_name.charAt(0)}.{selectedPlayer.last_name}</span> — tap a position
                </p>
              ) : (
                <p className="font-condensed text-xs text-gray-600">Select a player from the list</p>
              )}
            </div>

            {/* AFL Oval — sized by height so it always fits on screen */}
            <div className="flex-shrink-0 relative overflow-hidden flex flex-col"
              style={{
                /* Height fills screen minus: header(72) + hint(28) + interchange(110) + gaps+padding(40) */
                height: 'calc(100vh - 250px)',
                aspectRatio: '10 / 15',
                maxWidth: '100%',
                borderRadius: '50%',
                background: 'linear-gradient(180deg, #14a347 0%, #16a34a 35%, #15803d 50%, #16a34a 65%, #14a347 100%)',
                border: '3px solid rgba(255,255,255,0.15)',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 12px 40px rgba(0,0,0,0.7)',
              }}>

              {/* Field markings */}
              <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
                {/* 50m arc — top */}
                <div style={{
                  position: 'absolute', top: '27%', left: '50%', transform: 'translateX(-50%)',
                  width: '48%', height: '12%',
                  borderBottom: '1.5px solid rgba(255,255,255,0.22)',
                  borderLeft: '1.5px solid rgba(255,255,255,0.22)',
                  borderRight: '1.5px solid rgba(255,255,255,0.22)',
                  borderRadius: '0 0 50% 50%',
                }} />
                {/* 50m arc — bottom */}
                <div style={{
                  position: 'absolute', bottom: '27%', left: '50%', transform: 'translateX(-50%)',
                  width: '48%', height: '12%',
                  borderTop: '1.5px solid rgba(255,255,255,0.22)',
                  borderLeft: '1.5px solid rgba(255,255,255,0.22)',
                  borderRight: '1.5px solid rgba(255,255,255,0.22)',
                  borderRadius: '50% 50% 0 0',
                }} />
                {/* Centre circle */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '24%', height: '8%',
                  borderRadius: '50%',
                  border: '1.5px solid rgba(255,255,255,0.28)',
                }} />
                {/* Centre square */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '15%', height: '5%',
                  border: '1.5px solid rgba(255,255,255,0.18)',
                }} />
                {/* Centre dot */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.4)',
                }} />
                {/* Zone dividers */}
                <div style={{ position: 'absolute', top: '33.33%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.2)' }} />
                <div style={{ position: 'absolute', top: '66.66%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.2)' }} />
              </div>

              {renderZone('DEFENCE', '10%', '10%', '3%')}
              {renderZone('MIDFIELD', '5%', '3%', '3%')}
              {renderZone('FORWARD', '10%', '3%', '10%')}
            </div>

            {/* Interchange — same max-width as oval */}
            <div className="flex-shrink-0 rounded-2xl p-3 transition-all duration-100"
              style={{
                background: selectedId && benchPlayers.length < matchData.bench_size
                  ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.025)',
                border: `1.5px solid ${selectedId && benchPlayers.length < matchData.bench_size
                  ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.07)'}`,
                cursor: selectedId && benchPlayers.length < matchData.bench_size ? 'pointer' : 'default',
              }}
              onClick={handleTapBench}>
              <p className="font-condensed text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-center text-gray-500">
                Interchange · {benchPlayers.length} / {matchData.bench_size}
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(matchData.bench_size, 5)}, minmax(0, 1fr))`,
                gap: 5,
              }}>
                {benchPlayers.map(p => (
                  <FilledSlot key={p.id} player={p} posLabel="INT" onRemove={handleRemove} />
                ))}
                {Array.from({ length: matchData.bench_size - benchPlayers.length }).map((_, i) => (
                  <EmptySlot key={i} label="INT"
                    canDrop={!!selectedId && benchPlayers.length < matchData.bench_size}
                    onClick={handleTapBench} />
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
