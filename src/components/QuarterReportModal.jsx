import { useState } from 'react'
import { ArrowRight, X, ChevronUp, ChevronDown } from 'lucide-react'
import { useGameStore } from '../store/useGameStore'

const formatTime = (s) => {
  const sec = s || 0
  return `${Math.floor(sec / 60).toString().padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}`
}

export default function QuarterReportModal() {
  const players = useGameStore(s => s.players)
  const matchPlayers = useGameStore(s => s.matchPlayers)
  const playerTimers = useGameStore(s => s.playerTimers)
  const gameState = useGameStore(s => s.gameState)
  const startNextQuarter = useGameStore(s => s.startNextQuarter)
  const dismissQuarterReport = useGameStore(s => s.dismissQuarterReport)
  const [sortField, setSortField] = useState('number')
  const [sortDir, setSortDir] = useState('asc')

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const totalSeconds = gameState.quarterSeconds || 1

  const rows = players
    .filter(p => matchPlayers.find(mp => mp.player_id === p.id))
    .map(p => {
      const timer = playerTimers[p.id] || { togSeconds: 0, zoneSeconds: {} }
      const togPct = Math.round((timer.togSeconds / totalSeconds) * 100)
      return {
        ...p,
        togSeconds: timer.togSeconds,
        togPct,
        fwdSeconds: timer.zoneSeconds?.FORWARD || 0,
        midSeconds: timer.zoneSeconds?.MIDFIELD || 0,
        defSeconds: timer.zoneSeconds?.DEFENCE || 0,
        benchSeconds: timer.zoneSeconds?.BENCH || 0,
        status: matchPlayers.find(mp => mp.player_id === p.id)?.status,
      }
    })
    .sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1
      if (sortField === 'number') return (a.number - b.number) * mul
      if (sortField === 'tog') return (a.togSeconds - b.togSeconds) * mul
      if (sortField === 'togPct') return (a.togPct - b.togPct) * mul
      return 0
    })

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronUp size={12} className="opacity-30" />
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
  }

  const ThButton = ({ field, children }) => (
    <th
      className="px-3 py-2 text-left cursor-pointer hover:text-white transition-colors"
      onClick={() => handleSort(field)}
    >
      <span className="flex items-center gap-1">
        {children}
        <SortIcon field={field} />
      </span>
    </th>
  )

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <div className="bg-sharks-surface rounded-2xl border border-sharks-border w-full max-w-5xl max-h-[90vh] flex flex-col slide-up">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sharks-border">
          <div>
            <h2 className="font-condensed font-black text-2xl text-white uppercase tracking-wide">
              Q{gameState.quarter} Report
            </h2>
            <p className="font-condensed text-gray-400 text-sm">Quarter duration: {formatTime(totalSeconds)}</p>
          </div>
          <button onClick={dismissQuarterReport} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-sharks-surface2 transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-sharks-surface border-b border-sharks-border">
              <tr className="font-condensed font-bold text-xs text-gray-400 uppercase tracking-wider">
                <ThButton field="number">#</ThButton>
                <th className="px-3 py-2 text-left">Player</th>
                <ThButton field="tog">TOG</ThButton>
                <ThButton field="togPct">TOG%</ThButton>
                <th className="px-3 py-2 text-left text-red-400">FWD</th>
                <th className="px-3 py-2 text-left text-green-400">MID</th>
                <th className="px-3 py-2 text-left text-indigo-400">DEF</th>
                <th className="px-3 py-2 text-left text-gray-400">BENCH</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id} className={`border-b border-sharks-border/50 ${i % 2 === 0 ? 'bg-sharks-dark/30' : ''}`}>
                  <td className="px-3 py-2.5 font-condensed font-black text-white text-base">#{row.number}</td>
                  <td className="px-3 py-2.5 font-condensed font-semibold text-white uppercase">{row.last_name}, {row.first_name[0]}.</td>
                  <td className="px-3 py-2.5 font-condensed font-bold text-white tabular-nums">{formatTime(row.togSeconds)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 rounded-full bg-sharks-surface2 overflow-hidden">
                        <div className="h-full bg-sharks-red rounded-full" style={{ width: `${row.togPct}%` }} />
                      </div>
                      <span className="font-condensed font-bold text-white tabular-nums text-sm">{row.togPct}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-condensed text-red-300 tabular-nums">{formatTime(row.fwdSeconds)}</td>
                  <td className="px-3 py-2.5 font-condensed text-green-300 tabular-nums">{formatTime(row.midSeconds)}</td>
                  <td className="px-3 py-2.5 font-condensed text-indigo-300 tabular-nums">{formatTime(row.defSeconds)}</td>
                  <td className="px-3 py-2.5 font-condensed text-gray-400 tabular-nums">{formatTime(row.benchSeconds)}</td>
                  <td className="px-3 py-2.5">
                    {row.status === 'INJURED'
                      ? <span className="font-condensed text-xs text-red-400 bg-red-950 px-2 py-0.5 rounded uppercase">Injured</span>
                      : <span className="font-condensed text-xs text-green-400">Active</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-sharks-border">
          <button
            onClick={dismissQuarterReport}
            className="font-condensed font-bold text-sm px-6 h-11 rounded-lg bg-sharks-surface2 hover:bg-gray-700 text-gray-300 transition-colors border border-sharks-border uppercase tracking-wide"
          >
            Dismiss
          </button>
          {gameState.quarter < 4 && (
            <button
              onClick={startNextQuarter}
              className="font-condensed font-bold text-sm px-8 h-11 rounded-lg bg-sharks-red hover:bg-red-700 text-white transition-colors uppercase tracking-wide flex items-center gap-2"
            >
              Start Q{gameState.quarter + 1}
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
