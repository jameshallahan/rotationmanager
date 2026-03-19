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

const ZONE_STYLE = {
  DEFENCE:  { hover: 'rgba(79,70,229,0.2)',  border: 'rgba(79,70,229,0.45)',  textColor: 'rgba(165,180,252,0.7)' },
  MIDFIELD: { hover: 'rgba(5,150,105,0.2)',  border: 'rgba(5,150,105,0.45)',  textColor: 'rgba(110,231,183,0.7)' },
  FORWARD:  { hover: 'rgba(220,38,38,0.2)',  border: 'rgba(220,38,38,0.45)',  textColor: 'rgba(252,165,165,0.7)' },
  BENCH:    { hover: 'rgba(107,114,128,0.2)', border: 'rgba(107,114,128,0.45)', textColor: 'rgba(209,213,219,0.7)' },
}

function PlayerChip({ player, onRemove }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onRemove(player.id) }}
      className="flex flex-col items-center rounded-lg px-1.5 py-1 transition-all hover:brightness-125 active:scale-95"
      style={{ background: POS[player.primary_position].color, minWidth: '2.75rem' }}
      title={`${player.first_name} ${player.last_name} — tap to remove`}
    >
      <span className="font-condensed font-black text-white text-base leading-none">{player.number}</span>
      <span className="font-condensed text-white/75 text-[9px] leading-none tracking-wide">
        {player.last_name.slice(0, 5).toUpperCase()}
      </span>
    </button>
  )
}

function EmptySlot() {
  return (
    <div
      className="rounded-lg flex items-center justify-center"
      style={{ minWidth: '2.75rem', height: '2.375rem', border: '1px dashed rgba(255,255,255,0.12)' }}
    >
      <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '10px' }}>·</span>
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

  const renderFieldZone = (zone, padH, padTop, padBottom) => {
    const zps = getZonePlayers(zone)
    const empties = ZONE_MAX - zps.length
    const canDrop = !!selectedId && !isZoneFull(zone)
    const zs = ZONE_STYLE[zone]

    return (
      <div
        onClick={() => handleTapZone(zone)}
        className="flex flex-col items-center justify-center cursor-pointer transition-all duration-100"
        style={{
          flex: 1,
          paddingLeft: padH, paddingRight: padH,
          paddingTop: padTop, paddingBottom: padBottom,
          background: canDrop ? zs.hover : 'transparent',
          boxShadow: canDrop ? `inset 0 0 0 1.5px ${zs.border}` : 'none',
        }}
      >
        <span
          className="font-condensed text-[8px] uppercase tracking-[0.15em] mb-1 font-bold"
          style={{ color: zs.textColor }}
        >
          {zone}
        </span>
        <div className="flex flex-wrap justify-center gap-1">
          {zps.map(p => <PlayerChip key={p.id} player={p} onRemove={handleRemoveFromField} />)}
          {Array.from({ length: empties }).map((_, i) => <EmptySlot key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-sharks-dark">

      {/* Header */}
      <div className="flex items-center justify-between px-6 h-[72px] bg-sharks-surface border-b border-sharks-border flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => step === 1 ? navigate('/') : setStep(1)}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-sharks-surface2 transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-400" />
          </button>
          <img
            src="/sharks-logo.png" alt="Sorrento Sharks"
            className="h-10 w-auto" onError={e => { e.target.style.display = 'none' }}
          />
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
            <Check size={16} />
            Start Match
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

            {/* Interchange stepper */}
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
          <div className="w-40 flex-shrink-0 border-r border-sharks-border flex flex-col bg-sharks-surface">
            <div className="px-3 py-2 border-b border-sharks-border flex-shrink-0">
              <p className="font-condensed text-[10px] text-gray-500 uppercase tracking-widest">
                Unplaced · {unassigned.length}
              </p>
            </div>
            <div className="flex-1 overflow-auto">
              {unassigned.length === 0 ? (
                <div className="flex items-center justify-center h-16 px-3">
                  <p className="font-condensed text-xs text-gray-600 text-center">All players placed</p>
                </div>
              ) : (
                unassigned.map(player => (
                  <button
                    key={player.id}
                    onClick={() => handleSelectFromList(player.id)}
                    className="w-full flex items-center gap-2 px-2.5 py-2 border-b transition-all text-left"
                    style={{
                      borderBottomColor: 'rgba(255,255,255,0.05)',
                      borderLeftWidth: selectedId === player.id ? '3px' : '3px',
                      borderLeftColor: selectedId === player.id ? '#CC0000' : 'transparent',
                      background: selectedId === player.id ? 'rgba(204,0,0,0.08)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (selectedId !== player.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                    onMouseLeave={e => { if (selectedId !== player.id) e.currentTarget.style.background = 'transparent' }}
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
                      <p className="font-condensed text-[10px] leading-none font-bold" style={{ color: POS[player.primary_position].color }}>
                        {POS[player.primary_position].label}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right: AFL field */}
          <div className="flex-1 overflow-auto p-3 flex flex-col items-center gap-2">

            {/* Selected player hint */}
            <div className="h-6 flex items-center justify-center flex-shrink-0">
              {selectedPlayer ? (
                <p className="font-condensed text-xs text-gray-400">
                  Placing{' '}
                  <span
                    className="font-bold"
                    style={{ color: POS[selectedPlayer.primary_position].color }}
                  >
                    #{selectedPlayer.number} {selectedPlayer.last_name}
                  </span>
                  {' '}— tap a zone
                </p>
              ) : (
                <p className="font-condensed text-xs text-gray-600">Tap a player to place them</p>
              )}
            </div>

            {/* AFL Oval */}
            <div
              className="w-full flex-shrink-0 flex flex-col overflow-hidden"
              style={{
                maxWidth: '280px',
                borderRadius: '9999px',
                border: '2px solid rgba(255,255,255,0.1)',
                aspectRatio: '3 / 5',
                background: 'linear-gradient(180deg, #14532d 0%, #15803d 30%, #166534 50%, #15803d 70%, #14532d 100%)',
                position: 'relative',
              }}
            >
              {/* Decorative markings (non-interactive) */}
              <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
                {/* Centre circle */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  width: 56, height: 56,
                  transform: 'translate(-50%, -50%)',
                  borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.1)',
                }} />
                {/* Centre dot */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  width: 6, height: 6,
                  transform: 'translate(-50%, -50%)',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.15)',
                }} />
                {/* Top 50m arc */}
                <div style={{
                  position: 'absolute', top: '22%', left: '50%',
                  width: 80, height: 40,
                  transform: 'translateX(-50%)',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '0 0 50% 50%',
                }} />
                {/* Bottom 50m arc */}
                <div style={{
                  position: 'absolute', bottom: '22%', left: '50%',
                  width: 80, height: 40,
                  transform: 'translateX(-50%)',
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '50% 50% 0 0',
                }} />
              </div>

              {/* Zone dividers */}
              <div style={{ position: 'absolute', top: '33.33%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.12)', zIndex: 1 }} />
              <div style={{ position: 'absolute', top: '66.66%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.12)', zIndex: 1 }} />

              {/* DEFENCE — top */}
              {renderFieldZone('DEFENCE', '22%', '9%', '2%')}

              {/* MIDFIELD — centre */}
              {renderFieldZone('MIDFIELD', '8%', '2%', '2%')}

              {/* FORWARD — bottom */}
              {renderFieldZone('FORWARD', '22%', '2%', '9%')}
            </div>

            {/* Interchange */}
            <div
              className="w-full flex-shrink-0 rounded-2xl p-3 cursor-pointer transition-all duration-100"
              style={{
                maxWidth: '280px',
                background: selectedId && !isZoneFull('BENCH')
                  ? ZONE_STYLE.BENCH.hover
                  : 'rgba(255,255,255,0.025)',
                border: `1px solid ${selectedId && !isZoneFull('BENCH') ? ZONE_STYLE.BENCH.border : 'rgba(255,255,255,0.06)'}`,
              }}
              onClick={() => handleTapZone('BENCH')}
            >
              <p className="font-condensed text-[9px] uppercase tracking-[0.15em] font-bold mb-2 text-center"
                style={{ color: ZONE_STYLE.BENCH.textColor }}>
                Interchange · {getZonePlayers('BENCH').length} / {matchData.bench_size}
              </p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {getZonePlayers('BENCH').map(p => (
                  <PlayerChip key={p.id} player={p} onRemove={handleRemoveFromField} />
                ))}
                {Array.from({ length: matchData.bench_size - getZonePlayers('BENCH').length }).map((_, i) => (
                  <EmptySlot key={i} />
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
