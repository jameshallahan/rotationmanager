import { useState } from 'react'
import { Plus, Edit2, Trash2, Pause, Play, ChevronRight } from 'lucide-react'
import { useGameStore } from '../store/useGameStore'
import RotationGroupModal from './RotationGroupModal'

function fmt(s) {
  const t = s || 0
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

const POS_COLOR = {
  FORWARD:  'text-red-400',
  MIDFIELD: 'text-emerald-400',
  DEFENCE:  'text-indigo-400',
}

// RotationPanel is used both in GameDay (setupMode=false) and PreMatchSetup (setupMode=true)
export default function RotationPanel({ setupMode = false }) {
  const players        = useGameStore(s => s.players)
  const matchPlayers   = useGameStore(s => s.matchPlayers)
  const rotationGroups = useGameStore(s => s.rotationGroups)
  const gameState      = useGameStore(s => s.gameState)
  const currentMatch   = useGameStore(s => s.currentMatch)
  const addRotationGroup    = useGameStore(s => s.addRotationGroup)
  const updateRotationGroup = useGameStore(s => s.updateRotationGroup)
  const deleteRotationGroup = useGameStore(s => s.deleteRotationGroup)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState(null)

  // Build set of player IDs already in some group
  const takenPlayerIds = new Set(
    rotationGroups.flatMap(g => g.player_ids)
  )

  const handleSave = (groupData) => {
    if (groupData.id) {
      updateRotationGroup(groupData.id, groupData)
    } else {
      addRotationGroup(groupData)
    }
    setModalOpen(false)
    setEditingGroup(null)
  }

  const handleEdit = (group) => {
    setEditingGroup(group)
    setModalOpen(true)
  }

  const handleDelete = (group) => {
    if (window.confirm(`Delete "${group.name}"?`)) {
      deleteRotationGroup(group.id)
    }
  }

  const handleNew = () => {
    setEditingGroup(null)
    setModalOpen(true)
  }

  const getPlayer = (id) => players.find(p => p.id === id)

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Group list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {rotationGroups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-sharks-surface2 border border-sharks-border flex items-center justify-center mb-3">
              <ChevronRight size={20} className="text-gray-600" />
            </div>
            <p className="font-condensed font-bold text-gray-500 uppercase tracking-widest text-sm">No rotation groups</p>
            <p className="font-condensed text-xs text-gray-700 mt-1">Set up a group to track when players rotate</p>
          </div>
        )}

        {rotationGroups.map(group => {
          const len = group.player_ids.length
          const currentBenchIdx = group.current_step % len
          const currentBenchId = group.player_ids[currentBenchIdx]

          // Next rotation time
          const nextRotationTime = group.rotation_times[group.current_step]
          const secsUntilNext = nextRotationTime !== undefined
            ? nextRotationTime - gameState.quarterSeconds
            : null
          const isPast = secsUntilNext !== null && secsUntilNext <= 0
          const noMoreRotations = nextRotationTime === undefined

          return (
            <div
              key={group.id}
              className={`rounded-xl border p-3 transition-all ${
                group.is_active
                  ? 'bg-sharks-surface border-sharks-border'
                  : 'bg-sharks-surface/50 border-sharks-border/50 opacity-60'
              }`}
            >
              {/* Group header */}
              <div className="flex items-start justify-between mb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${group.is_active ? 'bg-sharks-red' : 'bg-gray-600'}`} />
                  <span className="font-condensed font-black text-sm uppercase tracking-widest text-white truncate">
                    {group.name}
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  <button
                    onClick={() => updateRotationGroup(group.id, { is_active: !group.is_active })}
                    className="p-1.5 rounded-lg hover:bg-sharks-surface2 text-gray-500 hover:text-white transition-colors"
                    title={group.is_active ? 'Pause' : 'Resume'}
                  >
                    {group.is_active ? <Pause size={13} /> : <Play size={13} />}
                  </button>
                  <button
                    onClick={() => handleEdit(group)}
                    className="p-1.5 rounded-lg hover:bg-sharks-surface2 text-gray-500 hover:text-white transition-colors"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(group)}
                    className="p-1.5 rounded-lg hover:bg-sharks-surface2 text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Countdown (in-game mode only) */}
              {!setupMode && group.is_active && (
                <div className={`mb-2.5 px-2.5 py-1.5 rounded-lg text-center font-condensed font-black tabular-nums ${
                  noMoreRotations
                    ? 'bg-sharks-surface2 text-gray-600 text-xs'
                    : isPast
                    ? 'bg-red-900/30 border border-red-800/40 text-red-400 text-sm'
                    : secsUntilNext <= 60
                    ? 'bg-yellow-900/20 border border-yellow-800/30 text-yellow-400 text-sm'
                    : 'bg-sharks-surface2 text-gray-300 text-sm'
                }`}>
                  {noMoreRotations
                    ? 'All rotations done this quarter'
                    : isPast
                    ? `Rotation overdue (${fmt(Math.abs(secsUntilNext))} ago)`
                    : `Next rotation in ${fmt(secsUntilNext)}`
                  }
                </div>
              )}

              {/* Player rotation order */}
              <div className="space-y-1">
                {group.player_ids.map((id, idx) => {
                  const p = getPlayer(id)
                  if (!p) return null
                  const mp = matchPlayers.find(m => m.player_id === id)
                  const posColor = POS_COLOR[mp?.current_position] || 'text-gray-400'
                  const isCurrentBench = !setupMode && idx === currentBenchIdx
                  const nextBenchIdx = (currentBenchIdx + 1) % len
                  const isNextOff = !setupMode && idx === nextBenchIdx && nextRotationTime !== undefined

                  return (
                    <div
                      key={id}
                      className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-all ${
                        isCurrentBench
                          ? 'bg-blue-900/20 border border-blue-800/30'
                          : isNextOff
                          ? 'bg-yellow-900/10 border border-yellow-800/20'
                          : 'bg-sharks-surface2/50'
                      }`}
                    >
                      <span className="font-condensed text-gray-600 w-4 text-xs text-center flex-shrink-0">{idx + 1}</span>
                      <span className={`font-condensed font-black text-sm flex-shrink-0 ${posColor}`}>
                        #{p.number}
                      </span>
                      <span className="font-condensed font-bold text-sm text-white flex-1 uppercase truncate">
                        {p.last_name}
                      </span>
                      {isCurrentBench && !setupMode && (
                        <span className="font-condensed text-[9px] text-blue-400 uppercase tracking-widest flex-shrink-0">Bench</span>
                      )}
                      {isNextOff && !setupMode && (
                        <span className="font-condensed text-[9px] text-yellow-500 uppercase tracking-widest flex-shrink-0">Next off</span>
                      )}
                      {setupMode && idx === 0 && (
                        <span className="font-condensed text-[9px] text-gray-600 uppercase tracking-widest flex-shrink-0">Starts bench</span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Rotation times */}
              <div className="mt-2 pt-2 border-t border-sharks-border/50 flex flex-wrap gap-1.5">
                {group.rotation_times.map((t, i) => {
                  const fired = !setupMode && i < group.current_step
                  return (
                    <span
                      key={i}
                      className={`font-condensed tabular-nums text-[11px] px-2 py-0.5 rounded font-bold ${
                        fired
                          ? 'bg-sharks-surface2 text-gray-600 line-through'
                          : i === group.current_step
                          ? 'bg-sharks-red/20 border border-sharks-red/40 text-sharks-red'
                          : 'bg-sharks-surface2 text-gray-400'
                      }`}
                    >
                      {fmt(t)}
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add group button */}
      <div className="flex-shrink-0 p-3 border-t border-sharks-border">
        <button
          onClick={handleNew}
          className="w-full h-10 rounded-lg flex items-center justify-center gap-2 font-condensed font-bold text-sm uppercase tracking-wide border border-dashed border-sharks-border text-gray-500 hover:text-white hover:border-gray-500 transition-colors"
        >
          <Plus size={15} /> New Rotation Group
        </button>
      </div>

      {/* Modal */}
      {modalOpen && (
        <RotationGroupModal
          group={editingGroup}
          players={players}
          matchPlayers={matchPlayers}
          takenPlayerIds={new Set(
            rotationGroups
              .filter(g => g.id !== editingGroup?.id)
              .flatMap(g => g.player_ids)
          )}
          matchId={currentMatch?.id}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditingGroup(null) }}
        />
      )}
    </div>
  )
}
