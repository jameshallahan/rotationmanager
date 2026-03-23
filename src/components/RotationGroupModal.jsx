import { useState, useEffect } from 'react'
import { X, Plus, Minus, ChevronUp, ChevronDown, Trash2 } from 'lucide-react'

// Convert MM:SS string to total seconds
function parseTime(str) {
  const parts = str.split(':')
  if (parts.length !== 2) return null
  const m = parseInt(parts[0], 10)
  const s = parseInt(parts[1], 10)
  if (isNaN(m) || isNaN(s) || s >= 60) return null
  return m * 60 + s
}

function fmtSecs(secs) {
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
}

const POS_COLOR = {
  FORWARD:  { bg: 'bg-red-900/40',    text: 'text-red-400',    border: 'border-red-800/50' },
  MIDFIELD: { bg: 'bg-emerald-900/40', text: 'text-emerald-400', border: 'border-emerald-800/50' },
  DEFENCE:  { bg: 'bg-indigo-900/40',  text: 'text-indigo-400',  border: 'border-indigo-800/50' },
}

export default function RotationGroupModal({ group, players, matchPlayers, takenPlayerIds, matchId, onSave, onClose }) {
  const isEdit = !!group

  const [name, setName] = useState(group?.name || '')
  const [selectedIds, setSelectedIds] = useState(group?.player_ids || [])
  // rotation_times stored as seconds; UI shows MM:SS strings
  const [timeInputs, setTimeInputs] = useState(
    group?.rotation_times?.map(fmtSecs) || ['5:00']
  )
  const [timeErrors, setTimeErrors] = useState([])
  const [isActive, setIsActive] = useState(group?.is_active ?? true)

  // Players available to add: in the match, not taken by another group (except if already in this group)
  const matchPlayerIds = new Set(matchPlayers.map(mp => mp.player_id))
  const allowedIds = new Set([...(group?.player_ids || [])])
  const available = players.filter(p =>
    matchPlayerIds.has(p.id) && (allowedIds.has(p.id) || !takenPlayerIds.has(p.id))
  ).sort((a, b) => a.number - b.number)

  const togglePlayer = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const moveUp = (idx) => {
    if (idx === 0) return
    const arr = [...selectedIds]
    ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
    setSelectedIds(arr)
  }

  const moveDown = (idx) => {
    if (idx === selectedIds.length - 1) return
    const arr = [...selectedIds]
    ;[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
    setSelectedIds(arr)
  }

  const addTime = () => setTimeInputs(prev => [...prev, ''])
  const removeTime = (idx) => setTimeInputs(prev => prev.filter((_, i) => i !== idx))
  const updateTime = (idx, val) => setTimeInputs(prev => prev.map((t, i) => i === idx ? val : t))

  const validate = () => {
    const errors = timeInputs.map(t => {
      if (!t.trim()) return 'Required'
      if (parseTime(t) === null) return 'Use M:SS format'
      return null
    })
    setTimeErrors(errors)
    if (errors.some(Boolean)) return false
    if (!name.trim()) return false
    if (selectedIds.length < 2) return false
    return true
  }

  const handleSave = () => {
    if (!validate()) return
    const rotation_times = timeInputs
      .map(parseTime)
      .sort((a, b) => a - b)
    onSave({
      ...(group || {}),
      id: group?.id,
      match_id: matchId,
      name: name.trim(),
      player_ids: selectedIds,
      rotation_times,
      is_active: isActive,
      current_step: group?.current_step ?? 0,
    })
  }

  const getPlayer = (id) => players.find(p => p.id === id)
  const getPosition = (id) => {
    const mp = matchPlayers.find(m => m.player_id === id)
    return mp?.current_position || 'BENCH'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-lg bg-sharks-surface border border-sharks-border rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[92dvh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-sharks-border flex-shrink-0">
          <h2 className="font-condensed font-black text-lg uppercase tracking-widest text-white">
            {isEdit ? 'Edit Rotation' : 'New Rotation Group'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-sharks-surface2 transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">

          {/* Name */}
          <div>
            <label className="font-condensed text-[11px] uppercase tracking-widest text-gray-500 block mb-1.5">
              Group Name
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Midfield Rotation"
              className="w-full bg-sharks-surface2 border border-sharks-border rounded-lg px-3 py-2 font-condensed text-sm text-white placeholder-gray-600 focus:outline-none focus:border-sharks-red"
            />
          </div>

          {/* Player picker */}
          <div>
            <label className="font-condensed text-[11px] uppercase tracking-widest text-gray-500 block mb-1.5">
              Players in Group <span className="text-gray-700">(tap to add/remove)</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {available.map(p => {
                const pos = getPosition(p.id)
                const col = POS_COLOR[pos] || POS_COLOR.MIDFIELD
                const selected = selectedIds.includes(p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlayer(p.id)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border font-condensed text-xs font-bold uppercase transition-all ${
                      selected
                        ? `${col.bg} ${col.text} ${col.border}`
                        : 'bg-sharks-surface2 text-gray-500 border-sharks-border'
                    }`}
                  >
                    <span className="font-black">{p.number}</span>
                    <span>{p.last_name}</span>
                  </button>
                )
              })}
            </div>
            {selectedIds.length < 2 && (
              <p className="font-condensed text-[10px] text-yellow-600">Select at least 2 players</p>
            )}
          </div>

          {/* Rotation order */}
          {selectedIds.length >= 2 && (
            <div>
              <label className="font-condensed text-[11px] uppercase tracking-widest text-gray-500 block mb-1.5">
                Rotation Order <span className="text-gray-700">(first player starts on bench)</span>
              </label>
              <div className="space-y-1.5">
                {selectedIds.map((id, idx) => {
                  const p = getPlayer(id)
                  if (!p) return null
                  const pos = getPosition(id)
                  const col = POS_COLOR[pos] || POS_COLOR.MIDFIELD
                  return (
                    <div key={id} className="flex items-center gap-2 bg-sharks-surface2 rounded-lg px-3 py-2 border border-sharks-border">
                      <span className="font-condensed text-gray-600 w-4 text-xs text-center">{idx + 1}</span>
                      <span className={`font-condensed font-black text-sm ${col.text}`}>#{p.number}</span>
                      <span className="font-condensed font-bold text-sm text-white flex-1 uppercase">{p.last_name}</span>
                      {idx === 0 && (
                        <span className="font-condensed text-[9px] text-gray-600 uppercase tracking-widest bg-sharks-surface px-1.5 py-0.5 rounded">Starts bench</span>
                      )}
                      <div className="flex gap-1">
                        <button onClick={() => moveUp(idx)} disabled={idx === 0} className="p-0.5 rounded text-gray-500 hover:text-white disabled:opacity-20">
                          <ChevronUp size={14} />
                        </button>
                        <button onClick={() => moveDown(idx)} disabled={idx === selectedIds.length - 1} className="p-0.5 rounded text-gray-500 hover:text-white disabled:opacity-20">
                          <ChevronDown size={14} />
                        </button>
                        <button onClick={() => togglePlayer(id)} className="p-0.5 rounded text-gray-500 hover:text-red-400">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Rotation times */}
          <div>
            <label className="font-condensed text-[11px] uppercase tracking-widest text-gray-500 block mb-1.5">
              Rotation Times (per quarter)
            </label>
            <div className="space-y-2">
              {timeInputs.map((t, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    value={t}
                    onChange={e => updateTime(idx, e.target.value)}
                    placeholder="5:00"
                    className={`w-24 bg-sharks-surface2 border rounded-lg px-3 py-2 font-condensed text-sm text-white text-center placeholder-gray-600 focus:outline-none tabular-nums ${
                      timeErrors[idx] ? 'border-red-600' : 'border-sharks-border focus:border-sharks-red'
                    }`}
                  />
                  {timeErrors[idx] && (
                    <span className="font-condensed text-[10px] text-red-500">{timeErrors[idx]}</span>
                  )}
                  <button
                    onClick={() => removeTime(idx)}
                    disabled={timeInputs.length === 1}
                    className="p-1 rounded text-gray-600 hover:text-red-400 disabled:opacity-20"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={addTime}
                className="flex items-center gap-1.5 font-condensed text-xs text-gray-500 hover:text-white transition-colors"
              >
                <Plus size={13} /> Add rotation time
              </button>
            </div>
            <p className="font-condensed text-[9px] text-gray-700 mt-1.5 uppercase tracking-widest">
              Times repeat each quarter · Enter as M:SS (e.g. 5:00, 10:00)
            </p>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <label className="font-condensed text-[11px] uppercase tracking-widest text-gray-500">
              Active
            </label>
            <button
              onClick={() => setIsActive(v => !v)}
              className={`w-10 h-6 rounded-full transition-colors relative ${isActive ? 'bg-sharks-red' : 'bg-sharks-surface2 border border-sharks-border'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isActive ? 'left-5' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-sharks-border flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-lg font-condensed font-bold text-sm uppercase tracking-wide text-gray-400 bg-sharks-surface2 border border-sharks-border hover:bg-sharks-surface transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || selectedIds.length < 2}
            className="flex-1 h-10 rounded-lg font-condensed font-black text-sm uppercase tracking-wide text-white bg-sharks-red disabled:opacity-40 hover:bg-red-700 transition-colors"
          >
            {isEdit ? 'Save Changes' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  )
}
