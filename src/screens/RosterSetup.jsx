import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2, Trash2, X, ChevronLeft, Check } from 'lucide-react'
import { useGameStore } from '../store/useGameStore'

const POSITIONS = ['FORWARD', 'MIDFIELD', 'DEFENCE']
const POS_COLORS = {
  FORWARD: 'bg-red-950 text-red-300 border-red-800',
  MIDFIELD: 'bg-green-950 text-green-300 border-green-800',
  DEFENCE: 'bg-indigo-950 text-indigo-300 border-indigo-800',
}
const POS_LABELS = { FORWARD: 'FWD', MIDFIELD: 'MID', DEFENCE: 'DEF' }

function Field({ label, error, children }) {
  return (
    <div>
      <label className="font-condensed text-xs text-gray-400 uppercase tracking-wider block mb-1.5">{label}</label>
      {children}
      {error && <p className="font-condensed text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}

function PlayerModal({ player, onSave, onClose, existingNumbers }) {
  const [form, setForm] = useState({
    first_name: player?.first_name || '',
    last_name: player?.last_name || '',
    number: player?.number || '',
    points: player?.points ?? '',
    primary_position: player?.primary_position || 'MIDFIELD',
    secondary_positions: player?.secondary_positions || [],
    active: true,
  })
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!form.first_name.trim()) e.first_name = 'Required'
    if (!form.last_name.trim()) e.last_name = 'Required'
    const num = parseInt(form.number)
    if (!num || num < 1 || num > 99) e.number = '1–99'
    else if (existingNumbers.includes(num) && num !== player?.number) e.number = 'Number taken'
    if (!form.primary_position) e.primary_position = 'Required'
    return e
  }

  const handleSave = () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    onSave({ ...form, number: parseInt(form.number), points: form.points !== '' ? parseInt(form.points) : null })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') onClose()
  }

  const toggleSecondary = (pos) => {
    if (pos === form.primary_position) return
    setForm(f => ({
      ...f,
      secondary_positions: f.secondary_positions.includes(pos)
        ? f.secondary_positions.filter(p => p !== pos)
        : [...f.secondary_positions, pos]
    }))
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-6" onKeyDown={handleKeyDown}>
      <div className="bg-sharks-surface rounded-2xl border border-sharks-border w-full max-w-sm slide-up shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-sharks-border">
          <h2 className="font-condensed font-extrabold text-xl text-white uppercase tracking-wide">
            {player ? 'Edit Player' : 'Add Player'}
          </h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-sharks-surface2 transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name" error={errors.first_name}>
              <input
                autoFocus
                className="w-full bg-sharks-surface2 border border-sharks-border text-white font-barlow rounded-xl px-3 h-12 focus:outline-none focus:border-sharks-red transition-colors text-base"
                value={form.first_name}
                onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
              />
            </Field>
            <Field label="Last Name" error={errors.last_name}>
              <input
                className="w-full bg-sharks-surface2 border border-sharks-border text-white font-barlow rounded-xl px-3 h-12 focus:outline-none focus:border-sharks-red transition-colors text-base"
                value={form.last_name}
                onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
              />
            </Field>
          </div>

          {/* Jersey number + Points row */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Jumper Number" error={errors.number}>
              <input
                type="number"
                min="1" max="99"
                className="w-full bg-sharks-surface2 border border-sharks-border text-white font-condensed font-black text-3xl rounded-xl px-4 h-14 focus:outline-none focus:border-sharks-red transition-colors text-center tracking-widest"
                value={form.number}
                onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
              />
            </Field>
            <Field label="Player Points">
              <input
                type="number"
                min="1" max="10"
                placeholder="—"
                className="w-full bg-sharks-surface2 border border-sharks-border text-white font-condensed font-black text-3xl rounded-xl px-4 h-14 focus:outline-none focus:border-sharks-red transition-colors text-center tracking-widest"
                value={form.points}
                onChange={e => setForm(f => ({ ...f, points: e.target.value }))}
              />
            </Field>
          </div>

          {/* Primary position */}
          <Field label="Primary Position" error={errors.primary_position}>
            <div className="flex gap-2">
              {POSITIONS.map(pos => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => setForm(f => ({
                    ...f,
                    primary_position: pos,
                    secondary_positions: f.secondary_positions.filter(p => p !== pos)
                  }))}
                  className={`flex-1 h-11 rounded-xl font-condensed font-bold text-sm uppercase tracking-wider border-2 transition-all ${
                    form.primary_position === pos
                      ? POS_COLORS[pos]
                      : 'bg-sharks-surface2 border-sharks-border text-gray-500 hover:border-gray-500 hover:text-gray-300'
                  }`}
                >
                  {POS_LABELS[pos]}
                </button>
              ))}
            </div>
          </Field>

          {/* Secondary positions */}
          <Field label="Secondary Position (optional)">
            <div className="flex gap-2">
              {POSITIONS.filter(pos => pos !== form.primary_position).map(pos => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => toggleSecondary(pos)}
                  className={`flex-1 h-11 rounded-xl font-condensed font-bold text-sm uppercase tracking-wider border-2 transition-all ${
                    form.secondary_positions.includes(pos)
                      ? POS_COLORS[pos]
                      : 'bg-sharks-surface2 border-sharks-border text-gray-500 hover:border-gray-500 hover:text-gray-300'
                  }`}
                >
                  {POS_LABELS[pos]}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 h-12 rounded-xl bg-sharks-surface2 border border-sharks-border font-condensed font-bold text-sm text-gray-300 uppercase tracking-wide hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 h-12 rounded-xl bg-sharks-red hover:bg-red-700 font-condensed font-bold text-sm text-white uppercase tracking-wide flex items-center justify-center gap-2 transition-colors"
          >
            <Check size={16} />
            {player ? 'Save' : 'Add Player'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RosterSetup() {
  const navigate = useNavigate()
  const players = useGameStore(s => s.players)
  const addPlayer = useGameStore(s => s.addPlayer)
  const updatePlayer = useGameStore(s => s.updatePlayer)
  const deletePlayer = useGameStore(s => s.deletePlayer)
  const [modal, setModal] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const existingNumbers = players.map(p => p.number)

  const handleSave = (data) => {
    if (modal === 'add') addPlayer(data)
    else updatePlayer(modal.id, data)
    setModal(null)
  }

  const sortedPlayers = [...players].sort((a, b) => a.number - b.number)

  return (
    <div className="h-screen flex flex-col bg-sharks-dark">
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-[72px] bg-sharks-surface border-b border-sharks-border flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-sharks-surface2 transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-400" />
          </button>
          {/* Logo */}
          <img
            src="/sharks-logo.png"
            alt="Sorrento Sharks"
            className="h-10 w-auto"
            onError={e => { e.target.style.display = 'none' }}
          />
          <div className="h-6 w-px bg-sharks-border" />
          <div>
            <h1 className="font-condensed font-black text-white text-2xl uppercase tracking-wide leading-none">Roster</h1>
            <p className="font-condensed text-gray-500 text-xs mt-0.5">{players.length} player{players.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={() => setModal('add')}
          className="h-11 px-5 bg-sharks-red hover:bg-red-700 text-white font-condensed font-bold text-sm uppercase tracking-wide rounded-xl flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          Add Player
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto">
        {sortedPlayers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
            <div className="w-20 h-20 rounded-full bg-sharks-surface border border-sharks-border flex items-center justify-center">
              <Plus size={32} className="text-gray-600" />
            </div>
            <div>
              <p className="font-condensed font-bold text-white text-xl uppercase tracking-wide">No players yet</p>
              <p className="font-condensed text-gray-500 text-sm mt-1">Tap "Add Player" to build your roster</p>
            </div>
            <button
              onClick={() => setModal('add')}
              className="h-12 px-8 bg-sharks-red hover:bg-red-700 text-white font-condensed font-bold text-sm uppercase tracking-widest rounded-xl flex items-center gap-2 transition-colors mt-2"
            >
              <Plus size={16} /> Add First Player
            </button>
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="flex items-center px-6 py-2 border-b border-sharks-border/50 sticky top-0 bg-sharks-dark/95 backdrop-blur-sm">
              <div className="w-16 font-condensed text-xs text-gray-500 uppercase tracking-widest">#</div>
              <div className="flex-1 font-condensed text-xs text-gray-500 uppercase tracking-widest">Name</div>
              <div className="w-20 font-condensed text-xs text-gray-500 uppercase tracking-widest text-center">Position</div>
              <div className="w-12 font-condensed text-xs text-gray-500 uppercase tracking-widest text-center">Pts</div>
              <div className="w-20" />
            </div>

            {/* Player rows */}
            {sortedPlayers.map((player, i) => (
              <div
                key={player.id}
                className={`flex items-center px-6 py-3.5 border-b border-sharks-border/40 hover:bg-sharks-surface/50 transition-colors group ${i % 2 === 0 ? '' : 'bg-white/[0.015]'}`}
              >
                {/* Number */}
                <div className="w-16">
                  <span className="font-condensed font-black text-2xl text-white leading-none">
                    {player.number}
                  </span>
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <span className="font-condensed font-bold text-white text-lg uppercase leading-none">
                    {player.last_name}
                  </span>
                  <span className="font-condensed text-gray-400 text-lg ml-2">
                    {player.first_name}
                  </span>
                </div>

                {/* Position badge */}
                <div className="w-20 flex justify-center">
                  <span className={`font-condensed text-xs font-bold px-2.5 py-1 rounded-lg border uppercase tracking-wide ${POS_COLORS[player.primary_position]}`}>
                    {POS_LABELS[player.primary_position]}
                  </span>
                </div>

                {/* Points */}
                <div className="w-12 text-center">
                  <span className="font-condensed font-bold text-white text-base">
                    {player.points ?? <span className="text-gray-600">—</span>}
                  </span>
                </div>

                {/* Actions */}
                <div className="w-20 flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => setModal(player)}
                    className="w-9 h-9 rounded-lg bg-sharks-surface2 hover:bg-gray-700 flex items-center justify-center transition-colors border border-transparent hover:border-sharks-border"
                    title="Edit"
                  >
                    <Edit2 size={14} className="text-gray-400" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(player)}
                    className="w-9 h-9 rounded-lg hover:bg-red-950 flex items-center justify-center transition-colors border border-transparent hover:border-red-900"
                    title="Delete"
                  >
                    <Trash2 size={14} className="text-gray-600 hover:text-red-400" />
                  </button>
                </div>
              </div>
            ))}

            {/* Footer count */}
            <div className="px-6 py-4 text-center">
              <span className="font-condensed text-xs text-gray-600 uppercase tracking-widest">
                {players.length} player{players.length !== 1 ? 's' : ''} in squad
              </span>
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <PlayerModal
          player={modal === 'add' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
          existingNumbers={existingNumbers}
        />
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-6">
          <div className="bg-sharks-surface rounded-2xl border border-sharks-border p-6 max-w-sm w-full slide-up shadow-2xl">
            <h3 className="font-condensed font-extrabold text-xl text-white mb-1">Remove Player?</h3>
            <p className="font-condensed text-gray-400 mb-6">
              #{deleteConfirm.number} {deleteConfirm.first_name} {deleteConfirm.last_name} will be permanently removed from the roster.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 h-12 rounded-xl bg-sharks-surface2 border border-sharks-border font-condensed font-bold text-sm text-gray-300 uppercase tracking-wide hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { deletePlayer(deleteConfirm.id); setDeleteConfirm(null) }}
                className="flex-1 h-12 rounded-xl bg-red-700 hover:bg-red-800 font-condensed font-bold text-sm text-white uppercase tracking-wide transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
