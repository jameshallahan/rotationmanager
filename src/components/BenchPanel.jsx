import { Heart } from 'lucide-react'
import PlayerCard from './PlayerCard'
import { useGameStore } from '../store/useGameStore'

export default function BenchPanel({ players, matchPlayers, playerTimers, selectedPlayerId, onSelectPlayer }) {
  const markInjured = useGameStore(s => s.markInjured)
  const returnFromInjury = useGameStore(s => s.returnFromInjury)

  const benchPlayers = players.filter(p => {
    const mp = matchPlayers.find(mp => mp.player_id === p.id)
    return mp && mp.current_position === 'BENCH' && mp.status !== 'INJURED'
  })

  const injuredPlayers = players.filter(p => {
    const mp = matchPlayers.find(mp => mp.player_id === p.id)
    return mp && mp.status === 'INJURED'
  })

  return (
    <div className="w-[260px] flex-shrink-0 flex flex-col border-l border-sharks-border bg-sharks-surface/50 p-2 gap-3">
      {/* Bench header */}
      <div className="flex items-center justify-between px-1">
        <span className="font-condensed font-bold text-xs uppercase tracking-widest text-gray-400">Bench</span>
        <span className={`font-condensed text-xs ${benchPlayers.length === 4 ? 'text-gray-400' : 'text-yellow-500'}`}>
          {benchPlayers.length}/4
        </span>
      </div>

      {/* Bench slots - 2x2 grid */}
      <div className="grid grid-cols-2 gap-2">
        {benchPlayers.map(player => {
          const mp = matchPlayers.find(mp => mp.player_id === player.id)
          const timer = playerTimers[player.id]
          return (
            <PlayerCard
              key={player.id}
              player={player}
              matchPlayer={mp}
              togSeconds={timer?.togSeconds}
              benchSeconds={timer?.zoneSeconds?.BENCH}
              isSelected={selectedPlayerId === player.id}
              onSelect={onSelectPlayer}
              compact
            />
          )
        })}
        {Array.from({ length: Math.max(0, 4 - benchPlayers.length) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="rounded-lg border-2 border-dashed border-sharks-border opacity-30 min-h-[80px]"
          />
        ))}
      </div>

      {/* Injured section */}
      {injuredPlayers.length > 0 && (
        <>
          <div className="h-px bg-sharks-border" />
          <div className="px-1">
            <span className="font-condensed font-bold text-xs uppercase tracking-widest text-red-500 flex items-center gap-1">
              <Heart size={10} className="fill-red-500" /> Injured
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {injuredPlayers.map(player => {
              const mp = matchPlayers.find(mp => mp.player_id === player.id)
              const timer = playerTimers[player.id]
              return (
                <button
                  key={player.id}
                  onClick={() => {
                    if (window.confirm(`Return ${player.first_name} ${player.last_name} to bench?`)) {
                      returnFromInjury(player.id)
                    }
                  }}
                  className="flex items-center gap-3 p-2 rounded-lg bg-sharks-surface border border-red-900/30 opacity-60 hover:opacity-80 transition-opacity text-left"
                >
                  <span className="font-condensed font-black text-red-400 text-xl">#{player.number}</span>
                  <div>
                    <div className="font-condensed font-bold text-sm text-gray-300 uppercase">{player.last_name}</div>
                    <div className="font-condensed text-xs text-red-400">INJURED</div>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
