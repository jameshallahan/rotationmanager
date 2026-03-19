import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Download, ChevronUp, ChevronDown, Home } from 'lucide-react'
import { useGameStore } from '../store/useGameStore'

const formatTime = (s) => {
  const sec = s || 0
  return `${Math.floor(sec / 60).toString().padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}`
}

export default function Reports() {
  const navigate = useNavigate()
  const players = useGameStore(s => s.players)
  const matchPlayers = useGameStore(s => s.matchPlayers)
  const playerTimers = useGameStore(s => s.playerTimers)
  const gameState = useGameStore(s => s.gameState)
  const currentMatch = useGameStore(s => s.currentMatch)
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
      const togPct = Math.round((timer.togSeconds / Math.max(totalSeconds, 1)) * 100)
      return {
        ...p,
        togSeconds: timer.togSeconds,
        togPct: Math.min(togPct, 100),
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

  return (
    <div className="h-screen flex flex-col bg-sharks-dark">
      <div className="flex items-center justify-between px-6 h-[72px] bg-sharks-surface border-b border-sharks-border flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-sharks-surface2">
            <ChevronLeft size={20} className="text-gray-400" />
          </button>
          <button onClick={() => navigate('/')} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-sharks-surface2" title="Home">
            <Home size={18} className="text-gray-400" />
          </button>
          <div>
            <h1 className="font-condensed font-black text-2xl text-white uppercase">Report</h1>
            <p className="font-condensed text-gray-500 text-xs">
              Q{gameState.quarter} · {currentMatch ? `vs ${currentMatch.opponent}` : ''} · {formatTime(gameState.quarterSeconds)} elapsed
            </p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="h-11 px-4 bg-sharks-surface2 hover:bg-gray-700 border border-sharks-border text-white font-condensed font-bold text-sm uppercase tracking-wide rounded-xl flex items-center gap-2 transition-colors"
        >
          <Download size={16} />
          Export
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-sharks-surface border-b border-sharks-border">
            <tr className="font-condensed font-bold text-xs text-gray-400 uppercase tracking-wider">
              <th className="px-4 py-3 text-left cursor-pointer hover:text-white" onClick={() => handleSort('number')}>
                <span className="flex items-center gap-1"># <SortIcon field="number" /></span>
              </th>
              <th className="px-4 py-3 text-left">Player</th>
              <th className="px-4 py-3 text-left cursor-pointer hover:text-white" onClick={() => handleSort('tog')}>
                <span className="flex items-center gap-1">TOG <SortIcon field="tog" /></span>
              </th>
              <th className="px-4 py-3 text-left cursor-pointer hover:text-white" onClick={() => handleSort('togPct')}>
                <span className="flex items-center gap-1">TOG% <SortIcon field="togPct" /></span>
              </th>
              <th className="px-4 py-3 text-left text-red-400">FWD</th>
              <th className="px-4 py-3 text-left text-green-400">MID</th>
              <th className="px-4 py-3 text-left text-indigo-400">DEF</th>
              <th className="px-4 py-3 text-left text-gray-400">BENCH</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id} className={`border-b border-sharks-border/50 transition-colors hover:bg-sharks-surface/50 ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
                <td className="px-4 py-3 font-condensed font-black text-white text-base">#{row.number}</td>
                <td className="px-4 py-3 font-condensed font-semibold text-white uppercase">{row.last_name}, {row.first_name[0]}.</td>
                <td className="px-4 py-3 font-condensed font-bold text-white tabular-nums">{formatTime(row.togSeconds)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-sharks-surface2 overflow-hidden">
                      <div className="h-full bg-sharks-red rounded-full transition-all" style={{ width: `${row.togPct}%` }} />
                    </div>
                    <span className="font-condensed font-bold text-white tabular-nums">{row.togPct}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-condensed text-red-300 tabular-nums">{formatTime(row.fwdSeconds)}</td>
                <td className="px-4 py-3 font-condensed text-green-300 tabular-nums">{formatTime(row.midSeconds)}</td>
                <td className="px-4 py-3 font-condensed text-indigo-300 tabular-nums">{formatTime(row.defSeconds)}</td>
                <td className="px-4 py-3 font-condensed text-gray-400 tabular-nums">{formatTime(row.benchSeconds)}</td>
                <td className="px-4 py-3">
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
    </div>
  )
}
