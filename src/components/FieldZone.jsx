import PlayerCard from './PlayerCard'

const ZONE_CONFIG = {
  FORWARD: {
    label: 'FORWARD ZONE',
    labelColor: 'text-red-400',
    borderColor: 'border-red-900/30',
    bgColor: 'bg-red-950/20',
    count: 6,
  },
  MIDFIELD: {
    label: 'MIDFIELD ZONE',
    labelColor: 'text-green-400',
    borderColor: 'border-green-900/30',
    bgColor: 'bg-green-950/20',
    count: 6,
  },
  DEFENCE: {
    label: 'DEFENCE ZONE',
    labelColor: 'text-indigo-400',
    borderColor: 'border-indigo-900/30',
    bgColor: 'bg-indigo-950/20',
    count: 6,
  },
}

export default function FieldZone({ zone, players, matchPlayers, playerTimers, selectedPlayerId, onSelectPlayer }) {
  const config = ZONE_CONFIG[zone]
  const zonePlayers = players.filter(p => {
    const mp = matchPlayers.find(mp => mp.player_id === p.id)
    return mp && mp.current_position === zone && mp.status !== 'INJURED'
  })

  return (
    <div className={`flex-1 rounded-xl border ${config.borderColor} ${config.bgColor} p-2 flex flex-col min-h-0`}>
      {/* Zone header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className={`font-condensed font-bold text-xs uppercase tracking-widest ${config.labelColor}`}>
          {config.label}
        </span>
        <span className={`font-condensed text-xs ${zonePlayers.length === 6 ? config.labelColor : 'text-yellow-500'}`}>
          {zonePlayers.length}/{config.count}
        </span>
      </div>

      {/* Players grid */}
      <div className="flex-1 grid grid-cols-3 grid-rows-2 gap-2 min-h-0">
        {zonePlayers.map(player => {
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
            />
          )
        })}
        {/* Empty slots */}
        {Array.from({ length: Math.max(0, 6 - zonePlayers.length) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className={`rounded-lg border-2 border-dashed ${config.borderColor} opacity-30 min-h-[80px]`}
          />
        ))}
      </div>
    </div>
  )
}
