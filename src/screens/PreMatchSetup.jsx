import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Check, Plus, Minus } from 'lucide-react'
import { useGameStore } from '../store/useGameStore'

const ZONE_MAX = 6

const POS = {
  FORWARD:  { color: '#dc2626', label: 'FWD' },
  MIDFIELD: { color: '#059669', label: 'MID' },
  DEFENCE:  { color: '#4f46e5', label: 'DEF' },
  BENCH:    { color: '#6b7280', label: 'INT' },
}

const ZONE_ACCENT = {
  DEFENCE:  { glow: 'rgba(79,70,229,0.35)',  ring: 'rgba(79,70,229,0.6)',  dim: 'rgba(79,70,229,0.12)' },
  MIDFIELD: { glow: 'rgba(5,150,105,0.35)',  ring: 'rgba(5,150,105,0.6)',  dim: 'rgba(5,150,105,0.12)' },
  FORWARD:  { glow: 'rgba(220,38,38,0.35)',  ring: 'rgba(220,38,38,0.6)',  dim: 'rgba(220,38,38,0.12)' },
  BENCH:    { glow: 'rgba(107,114,128,0.35)', ring: 'rgba(107,114,128,0.6)', dim: 'rgba(107,114,128,0.12)' },
}

// Chip shown on the field for a placed player
function FieldChip({ player, onRemove }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onRemove(player.id) }}
      className="flex flex-col items-center rounded-md transition-all hover:brightness-125 active:scale-90"
      style={{
        background: POS[player.primary_position].color,
        minWidth: '2.5rem',
        paddingTop: 3, paddingBottom: 3, paddingLeft: 5, paddingRight: 5,
        boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
      }}
    >
      <span className="font-condensed font-black text-white leading-none" style={{ fontSize: 15 }}>
        {player.number}
      </span>
      <span className="font-condensed text-white/80 leading-none tracking-wide uppercase" style={{ fontSize: 8 }}>
        {player.last_name.slice(0, 5)}
      </span>
    </button>
  )
}

// Empty spot on the field
function EmptySpot() {
  return (
    <div
      className="rounded-md flex items-center justify-center"
      style={{
        minWidth: '2.5rem', height: '2.25rem',
        border: '1.5px dashed rgba(255,255,255,0.18)',
        background: 'rgba(0,0,0,0.12)',
      }}
    />
  )
}

// A zone section inside the oval
function FieldZone({ zone, players, benchSize, isZoneFull, selectedId, onTapZone, onRemove, padH, padTop, padBottom }) {
  const zps = players
  const max = zone === 'BENCH' ? benchSize : ZONE_MAX
  const empties = max - zps.length
  const canDrop = !!selectedId && !isZoneFull
  const acc = ZONE_ACCENT[zone]

  return (
    <div
      onClick={() => onTapZone(zone)}
      className="flex flex-col items-center justify-center transition-all duration-100"
      style={{
        flex: 1,
        paddingLeft: padH, paddingRight: padH,
        paddingTop: padTop, paddingBottom: padBottom,
        cursor: canDrop ? 'pointer' : 'default',
        background: canDrop ? acc.dim : 'transparent',
        boxShadow: canDrop ? `inset 0 0 0 1.5px ${acc.ring}` : 'none',
      }}
    >
      {/* 3-column grid of chips + empty spots */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '4px',
          width: '100%',
          justifyItems: 'center',
        }}
      >
        {zps.map(p => <FieldChip key={p.id} player={p} onRemove={onRemove} />)}
        {Array.from({ length: empties }).map((_, i) => <EmptySpot key={i} />)}
      </div>
    </div>
  )
}

export default function PreMatchSetup() {
  const navigate = useNavigate()
  const players = useGameStore(s => s.players)
  const createMatch = useGameStore(s => s.createMatch)
  const setMatchPlayers = useGameStore(s => s.setMatchPlayers)

  const [step, setStep] = useState(1)
  const [matchData, setMatchData] = useState({
    opponent: '',
    date: new Date().toISOString().split('T')[0],
    venue: '',
    bench_size: 4,
  })
  const [assignments, setAssignments] = useState({})
  const [selectedId, setSelectedId] = useState(null)

  const activePlayers = players.filter(p => p.active).sort((a, b) => a.number - b.number)
  const unassigned = activePlayers.filter(p => !assignments[p.id])
  const totalNeeded = 18 + matchData.bench_size
  const totalAssigned = Object.keys(assignments).length
  const canStart = totalAssigned === totalNeeded

  const getZonePlayers = zone => activePlayers.filter(p => assignments[p.id] === zone)
  const isZoneFull = zone => getZonePlayers(zone).length >= (zone === 'BENCH' ? matchData.bench_size : ZONE_MAX)

  const handleSelectFromList = id => setSelectedId(id === selectedId ? null : id)

  const handleTapZone = zone => {
    if (!selectedId || isZoneFull(zone)) return
    setAssignments(prev => ({ ...prev, [selectedId]: zone }))
    const remaining = unassigned.filter(p => p.id !== selectedId)
    setSelectedId(remaining[0]?.id ?? null)
  }

  const handleRemoveFromField = id => {
    setAssignments(prev => { const n = { ...prev }; delete n[id]; return n })
    setSelectedId(id)
  }

  const handleStart = () => {
    if (!canStart) return
    const match = createMatch(matchData)
    setMatchPlayers(
      Object.entries(assignments).map(([player_id, current_position]) => ({
        player_id, match_id: match.id, current_position, status: 'ACTIVE',
      }))
    )
    navigate('/match/live')
  }

  const selectedPlayer = activePlayers.find(p => p.id === selectedId)

  return (
    <div className="h-screen flex flex-col bg-sharks-dark">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 h-[72px] bg-sharks-surface border-b border-sharks-border flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => step === 1 ? navigate('/') : setStep(1)}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-sharks-surface2 transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-400" />
          </button>
          <img src="/sharks-logo.png" alt="" className="h-10 w-auto" onError={e => { e.target.style.display = 'none' }} />
          <div className="h-6 w-px bg-sharks-border" />
          <div>
            <h1 className="font-condensed font-black text-white text-2xl uppercase tracking-wide leading-none">
              {step === 1 ? 'New Match' : 'Team Selection'}
            </h1>
            <p className="font-condensed text-gray-500 text-xs mt-0.5">
              {step === 1
                ? `Step 1 of 2 · ${18 + matchData.bench_size} players needed`
                : `${totalAssigned} / ${totalNeeded} placed`}
            </p>
          </div>
        </div>
        {step === 2 && (
          <button
            onClick={handleStart}
            disabled={!canStart}
            className={`h-11 px-5 font-condensed font-bold text-sm uppercase tracking-wide rounded-xl flex items-center gap-2 transition-all ${
              canStart
                ? 'bg-sharks-red hover:bg-red-700 text-white'
                : 'bg-sharks-surface2 text-gray-600 cursor-not-allowed'
            }`}
          >
            <Check size={16} /> Start Match
          </button>
        )}
      </div>

      {/* ── Step 1: Match details ── */}
      {step === 1 && (
        <div className="flex-1 overflow-auto flex items-center justify-center p-6">
          <div className="w-full max-w-sm flex flex-col gap-5">
            <div>
              <label className="font-condensed text-xs text-gray-400 uppercase tracking-wider block mb-1.5">Opponent</label>
              <input
                autoFocus
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
                <input
                  type="date"
                  className="w-full bg-sharks-surface border border-sharks-border text-white font-barlow rounded-xl px-4 h-12 focus:outline-none focus:border-sharks-red transition-colors"
                  value={matchData.date}
                  onChange={e => setMatchData(d => ({ ...d, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="font-condensed text-xs text-gray-400 uppercase tracking-wider block mb-1.5">Venue</label>
                <input
                  className="w-full bg-sharks-surface border border-sharks-border text-white font-barlow rounded-xl px-4 h-12 focus:outline-none focus:border-sharks-red transition-colors placeholder:text-gray-600"
                  placeholder="Ground name"
                  value={matchData.venue}
                  onChange={e => setMatchData(d => ({ ...d, venue: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="font-condensed text-xs text-gray-400 uppercase tracking-wider block mb-1.5">Interchange</label>
              <div className="flex items-center bg-sharks-surface border border-sharks-border rounded-xl overflow-hidden h-14">
                <button
                  onClick={() => setMatchData(d => ({ ...d, bench_size: Math.max(4, d.bench_size - 1) }))}
                  className="w-14 h-full flex items-center justify-center hover:bg-sharks-surface2 transition-colors border-r border-sharks-border"
                >
                  <Minus size={18} className="text-gray-400" />
                </button>
                <div className="flex-1 flex flex-col items-center justify-center">
                  <span className="font-condensed font-black text-white text-3xl leading-none">{matchData.bench_size}</span>
                  <span className="font-condensed text-gray-500 text-xs">on interchange</span>
                </div>
                <button
                  onClick={() => setMatchData(d => ({ ...d, bench_size: Math.min(10, d.bench_size + 1) }))}
                  className="w-14 h-full flex items-center justify-center hover:bg-sharks-surface2 transition-colors border-l border-sharks-border"
                >
                  <Plus size={18} className="text-gray-400" />
                </button>
              </div>
              <p className="font-condensed text-xs text-gray-600 mt-1.5 text-center">
                {18 + matchData.bench_size} total players · 4–10 allowed
              </p>
            </div>

            <button
              onClick={() => matchData.opponent.trim() && setStep(2)}
              disabled={!matchData.opponent.trim()}
              className={`w-full h-12 rounded-xl font-condensed font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                matchData.opponent.trim()
                  ? 'bg-sharks-red hover:bg-red-700 text-white'
                  : 'bg-sharks-surface2 text-gray-600 cursor-not-allowed'
              }`}
            >
              Select Team <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Field placement ── */}
      {step === 2 && (
        <div className="flex-1 flex overflow-hidden">

          {/* Left: unassigned player list */}
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
              ) : (
                unassigned.map(player => (
                  <button
                    key={player.id}
                    onClick={() => handleSelectFromList(player.id)}
                    className="w-full flex items-center gap-2 px-2.5 py-2 border-b transition-all text-left"
                    style={{
                      borderBottomColor: 'rgba(255,255,255,0.05)',
                      borderLeft: `3px solid ${selectedId === player.id ? '#CC0000' : 'transparent'}`,
                      background: selectedId === player.id ? 'rgba(204,0,0,0.1)' : 'transparent',
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ background: POS[player.primary_position].color }}
                    >
                      <span className="font-condensed font-black text-white text-sm">{player.number}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-condensed font-bold text-white text-sm uppercase leading-tight truncate">
                        {player.last_name}
                      </p>
                      <p className="font-condensed text-[10px] font-bold leading-none" style={{ color: POS[player.primary_position].color }}>
                        {POS[player.primary_position].label}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right: AFL field */}
          <div className="flex-1 overflow-auto flex flex-col items-center py-3 px-2 gap-2">

            {/* Hint bar */}
            <div className="h-5 flex items-center justify-center flex-shrink-0 w-full">
              {selectedPlayer ? (
                <p className="font-condensed text-xs text-gray-400 text-center">
                  Placing{' '}
                  <span className="font-black" style={{ color: POS[selectedPlayer.primary_position].color }}>
                    #{selectedPlayer.number} {selectedPlayer.last_name}
                  </span>
                  {' '}— tap a zone on the field
                </p>
              ) : (
                <p className="font-condensed text-xs text-gray-600">Select a player from the list</p>
              )}
            </div>

            {/* ── AFL Oval ── */}
            <div
              className="flex-shrink-0 relative overflow-hidden flex flex-col"
              style={{
                width: '100%',
                maxWidth: 310,
                // True ellipse: border-radius 50% creates a perfect oval
                borderRadius: '50%',
                aspectRatio: '10 / 15',
                background: 'linear-gradient(180deg, #14a347 0%, #16a34a 40%, #15803d 50%, #16a34a 60%, #14a347 100%)',
                border: '3px solid rgba(255,255,255,0.15)',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.6)',
              }}
            >
              {/* ── Field markings (non-interactive) ── */}
              <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>

                {/* Goal square — top (defence end) */}
                <div style={{
                  position: 'absolute', top: '3%', left: '50%',
                  transform: 'translateX(-50%)',
                  width: 36, height: 16,
                  border: '1.5px solid rgba(255,255,255,0.35)',
                  borderRadius: 2,
                }} />

                {/* Goal square — bottom (forward end) */}
                <div style={{
                  position: 'absolute', bottom: '3%', left: '50%',
                  transform: 'translateX(-50%)',
                  width: 36, height: 16,
                  border: '1.5px solid rgba(255,255,255,0.35)',
                  borderRadius: 2,
                }} />

                {/* 50m arc — top */}
                <div style={{
                  position: 'absolute', top: '26%', left: '50%',
                  transform: 'translateX(-50%)',
                  width: 130, height: 65,
                  borderBottom: '1.5px solid rgba(255,255,255,0.25)',
                  borderLeft: '1.5px solid rgba(255,255,255,0.25)',
                  borderRight: '1.5px solid rgba(255,255,255,0.25)',
                  borderRadius: '0 0 65px 65px',
                }} />

                {/* 50m arc — bottom */}
                <div style={{
                  position: 'absolute', bottom: '26%', left: '50%',
                  transform: 'translateX(-50%)',
                  width: 130, height: 65,
                  borderTop: '1.5px solid rgba(255,255,255,0.25)',
                  borderLeft: '1.5px solid rgba(255,255,255,0.25)',
                  borderRight: '1.5px solid rgba(255,255,255,0.25)',
                  borderRadius: '65px 65px 0 0',
                }} />

                {/* Centre circle */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 72, height: 72,
                  borderRadius: '50%',
                  border: '1.5px solid rgba(255,255,255,0.3)',
                }} />

                {/* Centre square */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 44, height: 44,
                  border: '1.5px solid rgba(255,255,255,0.2)',
                }} />

                {/* Centre dot */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 7, height: 7,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.4)',
                }} />

                {/* Zone divider lines */}
                <div style={{ position: 'absolute', top: '33.33%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.18)' }} />
                <div style={{ position: 'absolute', top: '66.66%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.18)' }} />
              </div>

              {/* ── DEFENCE zone (top third) ── */}
              <FieldZone
                zone="DEFENCE"
                players={getZonePlayers('DEFENCE')}
                benchSize={matchData.bench_size}
                isZoneFull={isZoneFull('DEFENCE')}
                selectedId={selectedId}
                onTapZone={handleTapZone}
                onRemove={handleRemoveFromField}
                padH="20%"
                padTop="12%"
                padBottom="4%"
              />

              {/* ── MIDFIELD zone (centre third) ── */}
              <FieldZone
                zone="MIDFIELD"
                players={getZonePlayers('MIDFIELD')}
                benchSize={matchData.bench_size}
                isZoneFull={isZoneFull('MIDFIELD')}
                selectedId={selectedId}
                onTapZone={handleTapZone}
                onRemove={handleRemoveFromField}
                padH="6%"
                padTop="4%"
                padBottom="4%"
              />

              {/* ── FORWARD zone (bottom third) ── */}
              <FieldZone
                zone="FORWARD"
                players={getZonePlayers('FORWARD')}
                benchSize={matchData.bench_size}
                isZoneFull={isZoneFull('FORWARD')}
                selectedId={selectedId}
                onTapZone={handleTapZone}
                onRemove={handleRemoveFromField}
                padH="20%"
                padTop="4%"
                padBottom="12%"
              />
            </div>

            {/* ── Interchange (below oval) ── */}
            <div
              className="flex-shrink-0 rounded-2xl p-3 transition-all duration-100"
              style={{
                width: '100%',
                maxWidth: 310,
                background: selectedId && !isZoneFull('BENCH')
                  ? ZONE_ACCENT.BENCH.dim
                  : 'rgba(255,255,255,0.03)',
                border: `1.5px solid ${selectedId && !isZoneFull('BENCH') ? ZONE_ACCENT.BENCH.ring : 'rgba(255,255,255,0.07)'}`,
                cursor: selectedId && !isZoneFull('BENCH') ? 'pointer' : 'default',
              }}
              onClick={() => handleTapZone('BENCH')}
            >
              <p className="font-condensed text-[9px] uppercase tracking-[0.15em] font-bold mb-2 text-center text-gray-500">
                Interchange · {getZonePlayers('BENCH').length} / {matchData.bench_size}
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${Math.min(matchData.bench_size, 5)}, minmax(0, 1fr))`,
                  gap: 4,
                  justifyItems: 'center',
                }}
              >
                {getZonePlayers('BENCH').map(p => <FieldChip key={p.id} player={p} onRemove={handleRemoveFromField} />)}
                {Array.from({ length: matchData.bench_size - getZonePlayers('BENCH').length }).map((_, i) => <EmptySpot key={i} />)}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
