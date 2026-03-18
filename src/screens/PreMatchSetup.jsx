import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { useGameStore } from '../store/useGameStore'

const POSITIONS = ['FORWARD', 'MIDFIELD', 'DEFENCE']
const POS_LABELS = { FORWARD: 'FWD', MIDFIELD: 'MID', DEFENCE: 'DEF' }
const POS_COLORS = { FORWARD: 'border-red-700 bg-red-950/50', MIDFIELD: 'border-green-700 bg-green-950/50', DEFENCE: 'border-indigo-700 bg-indigo-950/50' }

export default function PreMatchSetup() {
  const navigate = useNavigate()
  const players = useGameStore(s => s.players)
  const createMatch = useGameStore(s => s.createMatch)
  const setMatchPlayers = useGameStore(s => s.setMatchPlayers)

  const [step, setStep] = useState(1)
  const [matchData, setMatchData] = useState({ opponent: '', date: new Date().toISOString().split('T')[0], venue: '' })
  const [selectedIds, setSelectedIds] = useState([])
  const [assignments, setAssignments] = useState({}) // { playerId: 'FORWARD'|'MIDFIELD'|'DEFENCE'|'BENCH' }

  const activePlayers = players.filter(p => p.active).sort((a, b) => a.number - b.number)

  // Step 1: Match details
  const handleStep1 = () => {
    if (!matchData.opponent.trim()) return
    setStep(2)
  }

  // Step 2: Squad selection
  const togglePlayer = (id) => {
    setSelectedIds(ids =>
      ids.includes(id) ? ids.filter(i => i !== id) : ids.length < 22 ? [...ids, id] : ids
    )
  }

  const handleStep2 = () => {
    if (selectedIds.length < 18) return
    // Auto-assign based on primary position
    const auto = {}
    const counts = { FORWARD: 0, MIDFIELD: 0, DEFENCE: 0, BENCH: 0 }
    selectedIds.forEach(id => {
      const p = players.find(pl => pl.id === id)
      let pos = p.primary_position
      if (counts[pos] >= 6) pos = 'BENCH'
      if (counts.BENCH >= 4) pos = Object.keys(counts).find(k => counts[k] < (k === 'BENCH' ? 4 : 6)) || 'BENCH'
      auto[id] = pos
      counts[pos]++
    })
    setAssignments(auto)
    setStep(3)
  }

  // Step 3: Position assignment
  const reassign = (playerId, newPos) => {
    const zoneLimit = newPos === 'BENCH' ? 4 : 6
    const currentCount = Object.values(assignments).filter(p => p === newPos).length
    if (currentCount >= zoneLimit) return // zone full
    setAssignments(a => ({ ...a, [playerId]: newPos }))
  }

  const counts = { FORWARD: 0, MIDFIELD: 0, DEFENCE: 0, BENCH: 0 }
  Object.values(assignments).forEach(p => { if (counts[p] !== undefined) counts[p]++ })
  const isValid = counts.FORWARD === 6 && counts.MIDFIELD === 6 && counts.DEFENCE === 6 && counts.BENCH === 4

  const handleStartMatch = () => {
    const match = createMatch(matchData)
    const mps = selectedIds.map((pid, i) => ({
      id: `mp_${i}`,
      match_id: match.id,
      player_id: pid,
      current_position: assignments[pid] || 'BENCH',
      starting_position: assignments[pid] || 'BENCH',
      status: 'ACTIVE',
    }))
    setMatchPlayers(mps)
    navigate('/match/live')
  }

  return (
    <div className="h-screen flex flex-col bg-sharks-dark">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 h-[72px] bg-sharks-surface border-b border-sharks-border flex-shrink-0">
        <button onClick={() => step === 1 ? navigate('/') : setStep(s => s - 1)} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-sharks-surface2">
          <ChevronLeft size={20} className="text-gray-400" />
        </button>
        <div>
          <h1 className="font-condensed font-black text-2xl text-white uppercase">Pre-Match Setup</h1>
          <div className="flex gap-2 mt-0.5">
            {[1,2,3].map(s => (
              <div key={s} className={`h-1 w-8 rounded-full transition-colors ${step >= s ? 'bg-sharks-red' : 'bg-sharks-surface2'}`} />
            ))}
          </div>
        </div>
        <div className="ml-auto font-condensed text-gray-500 text-sm">Step {step} of 3</div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* Step 1: Match details */}
        {step === 1 && (
          <div className="max-w-md mx-auto flex flex-col gap-5">
            <h2 className="font-condensed font-extrabold text-2xl text-white uppercase">Match Details</h2>

            <div>
              <label className="font-condensed text-xs text-gray-400 uppercase tracking-wider block mb-1.5">Opponent *</label>
              <input
                className="w-full bg-sharks-surface border border-sharks-border text-white font-barlow text-lg rounded-xl px-4 h-14 focus:outline-none focus:border-sharks-red transition-colors"
                placeholder="e.g. Cottesloe"
                value={matchData.opponent}
                onChange={e => setMatchData(d => ({ ...d, opponent: e.target.value }))}
                autoFocus
              />
            </div>
            <div>
              <label className="font-condensed text-xs text-gray-400 uppercase tracking-wider block mb-1.5">Date *</label>
              <input
                type="date"
                className="w-full bg-sharks-surface border border-sharks-border text-white font-barlow rounded-xl px-4 h-14 focus:outline-none focus:border-sharks-red transition-colors"
                value={matchData.date}
                onChange={e => setMatchData(d => ({ ...d, date: e.target.value }))}
              />
            </div>
            <div>
              <label className="font-condensed text-xs text-gray-400 uppercase tracking-wider block mb-1.5">Venue (optional)</label>
              <input
                className="w-full bg-sharks-surface border border-sharks-border text-white font-barlow rounded-xl px-4 h-14 focus:outline-none focus:border-sharks-red transition-colors"
                placeholder="e.g. North Shore Reserve"
                value={matchData.venue}
                onChange={e => setMatchData(d => ({ ...d, venue: e.target.value }))}
              />
            </div>

            <button
              onClick={handleStep1}
              disabled={!matchData.opponent.trim()}
              className="w-full h-14 bg-sharks-red hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-condensed font-extrabold text-lg uppercase tracking-widest rounded-xl flex items-center justify-center gap-3 transition-colors mt-2"
            >
              Select Squad <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* Step 2: Squad selection */}
        {step === 2 && (
          <div className="flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between">
              <h2 className="font-condensed font-extrabold text-2xl text-white uppercase">Select Squad</h2>
              <div className={`font-condensed font-bold text-lg ${selectedIds.length >= 22 ? 'text-sharks-red' : 'text-white'}`}>
                {selectedIds.length} / 22
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 flex-1 overflow-auto">
              {activePlayers.map(player => {
                const selected = selectedIds.includes(player.id)
                return (
                  <button
                    key={player.id}
                    onClick={() => togglePlayer(player.id)}
                    className={`rounded-xl border-2 p-3 text-left transition-all relative ${
                      selected
                        ? 'bg-sharks-red/20 border-sharks-red'
                        : 'bg-sharks-surface border-sharks-border hover:border-gray-500'
                    }`}
                  >
                    {selected && <Check size={14} className="absolute top-2 right-2 text-sharks-red" />}
                    <div className="font-condensed font-black text-2xl text-white">#{player.number}</div>
                    <div className="font-condensed font-bold text-sm text-white uppercase leading-tight">{player.last_name}</div>
                    <div className="font-condensed text-xs text-gray-400">{player.first_name}</div>
                    <div className={`mt-1.5 font-condensed text-xs font-bold uppercase ${
                      player.primary_position === 'FORWARD' ? 'text-red-400' :
                      player.primary_position === 'MIDFIELD' ? 'text-green-400' : 'text-indigo-400'
                    }`}>{POS_LABELS[player.primary_position]}</div>
                  </button>
                )
              })}
            </div>

            <button
              onClick={handleStep2}
              disabled={selectedIds.length < 18}
              className="w-full h-14 bg-sharks-red hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-condensed font-extrabold text-lg uppercase tracking-widest rounded-xl flex items-center justify-center gap-3 transition-colors flex-shrink-0"
            >
              Assign Positions <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* Step 3: Position assignment */}
        {step === 3 && (
          <div className="flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between">
              <h2 className="font-condensed font-extrabold text-2xl text-white uppercase">Starting Positions</h2>
              <div className="flex gap-3">
                {Object.entries({ FORWARD: 'text-red-400', MIDFIELD: 'text-green-400', DEFENCE: 'text-indigo-400', BENCH: 'text-gray-400' }).map(([pos, color]) => (
                  <span key={pos} className={`font-condensed text-sm ${color}`}>
                    {POS_LABELS[pos] || pos}: {counts[pos]}/{pos === 'BENCH' ? 4 : 6}
                  </span>
                ))}
              </div>
            </div>

            {/* Zone columns */}
            <div className="flex gap-3 flex-1 overflow-auto min-h-0">
              {[...POSITIONS, 'BENCH'].map(zone => (
                <div key={zone} className={`flex-1 rounded-xl border-2 ${POS_COLORS[zone] || 'border-sharks-border bg-sharks-surface/30'} p-2 flex flex-col gap-1`}>
                  <div className={`font-condensed font-bold text-xs uppercase tracking-widest text-center pb-1 border-b border-sharks-border mb-1 ${
                    zone === 'FORWARD' ? 'text-red-400' : zone === 'MIDFIELD' ? 'text-green-400' : zone === 'DEFENCE' ? 'text-indigo-400' : 'text-gray-400'
                  }`}>
                    {POS_LABELS[zone] || zone} ({counts[zone]}/{zone === 'BENCH' ? 4 : 6})
                  </div>
                  {selectedIds
                    .filter(id => assignments[id] === zone)
                    .map(id => {
                      const p = players.find(pl => pl.id === id)
                      return (
                        <div key={id} className="bg-sharks-surface2 rounded-lg p-2 flex items-center gap-2">
                          <span className="font-condensed font-black text-white text-lg">#{p.number}</span>
                          <span className="font-condensed font-bold text-sm text-white uppercase flex-1">{p.last_name}</span>
                        </div>
                      )
                    })
                  }
                </div>
              ))}
            </div>

            {/* Player reassignment */}
            <div className="bg-sharks-surface rounded-xl border border-sharks-border p-3">
              <p className="font-condensed text-xs text-gray-400 uppercase tracking-wider mb-2">Tap a zone button to reassign each player:</p>
              <div className="flex flex-wrap gap-2">
                {selectedIds.map(id => {
                  const p = players.find(pl => pl.id === id)
                  const pos = assignments[id]
                  return (
                    <div key={id} className="flex items-center gap-1 bg-sharks-surface2 rounded-lg overflow-hidden">
                      <span className="font-condensed font-bold text-sm text-white px-2 py-1">#{p.number} {p.last_name}</span>
                      {[...POSITIONS, 'BENCH'].map(zone => (
                        <button
                          key={zone}
                          onClick={() => reassign(id, zone)}
                          className={`font-condensed text-xs font-semibold px-2 py-1 transition-colors ${
                            pos === zone
                              ? zone === 'FORWARD' ? 'bg-red-700 text-white'
                                : zone === 'MIDFIELD' ? 'bg-green-700 text-white'
                                : zone === 'DEFENCE' ? 'bg-indigo-700 text-white'
                                : 'bg-gray-600 text-white'
                              : 'hover:bg-sharks-surface text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          {POS_LABELS[zone] || zone.slice(0,5)}
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>

            <button
              onClick={handleStartMatch}
              disabled={!isValid}
              className="w-full h-16 bg-sharks-red hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-condensed font-black text-xl uppercase tracking-widest rounded-xl flex items-center justify-center gap-3 transition-colors flex-shrink-0 shadow-lg shadow-red-900/30"
            >
              Start Match <ChevronRight size={22} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
