import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import { POS_LABEL } from '../lib/positions'

const formatTime = (s) => {
  const sec = s || 0
  return `${Math.floor(sec / 60).toString().padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}`
}

const ZONE_STYLES = {
  FORWARD: {
    bg: 'bg-red-950/60',
    border: 'border-red-900/50',
    label: 'FWD',
    labelColor: 'text-red-400',
    numberColor: 'text-red-300',
  },
  MIDFIELD: {
    bg: 'bg-green-950/60',
    border: 'border-green-900/50',
    label: 'MID',
    labelColor: 'text-green-400',
    numberColor: 'text-green-300',
  },
  DEFENCE: {
    bg: 'bg-indigo-950/60',
    border: 'border-indigo-900/50',
    label: 'DEF',
    labelColor: 'text-indigo-400',
    numberColor: 'text-indigo-300',
  },
  BENCH: {
    bg: 'bg-sharks-surface',
    border: 'border-sharks-border',
    label: 'BENCH',
    labelColor: 'text-gray-500',
    numberColor: 'text-gray-400',
  },
}

export default function PlayerCard({ player, matchPlayer, togSeconds, benchSeconds, stintSeconds, isSelected, onSelect, compact }) {
  const [flash, setFlash] = useState(false)
  const position = matchPlayer?.current_position || 'BENCH'
  const isInjured = matchPlayer?.status === 'INJURED'
  const style = ZONE_STYLES[position] || ZONE_STYLES.BENCH
  const positionLabel = matchPlayer?.named_position ? POS_LABEL[matchPlayer.named_position] : style.label

  useEffect(() => {
    if (!isSelected && flash) return
    if (isSelected) setFlash(false)
  }, [isSelected])

  const handleClick = () => {
    if (isInjured) return
    onSelect(player.id)
  }

  const displaySeconds = position === 'BENCH' ? (benchSeconds || 0) : (togSeconds || 0)

  return (
    <button
      onClick={handleClick}
      className={`
        relative w-full h-full min-h-[80px] rounded-lg border-2 p-2 text-left transition-all duration-150
        ${isInjured ? 'opacity-40 cursor-not-allowed bg-sharks-surface border-sharks-border' : `${style.bg} ${style.border} hover:brightness-125`}
        ${isSelected ? 'selected-card border-sharks-red' : ''}
        ${flash ? 'swap-flash' : ''}
      `}
      disabled={isInjured}
    >
      {/* Jersey number */}
      <div className={`font-condensed font-black text-3xl leading-none ${isInjured ? 'text-gray-600' : style.numberColor}`}>
        #{player.number}
      </div>

      {/* Surname */}
      <div className={`font-condensed font-bold text-base leading-tight uppercase tracking-wide mt-0.5 ${isInjured ? 'text-gray-600' : 'text-white'}`}>
        {player.last_name}
      </div>

      {/* Position label */}
      {!compact && (
        <div className={`font-condensed text-xs font-semibold mt-1 leading-tight ${isInjured ? 'text-gray-600' : style.labelColor}`}>
          {positionLabel}
        </div>
      )}

      {/* Timer */}
      <div className={`font-condensed font-bold text-sm tabular-nums absolute bottom-2 right-2 ${isInjured ? 'text-gray-600' : 'text-white/70'}`}>
        {formatTime(displaySeconds)}
      </div>

      {/* Injured icon */}
      {isInjured && (
        <div className="absolute top-2 right-2">
          <Heart size={14} className="text-red-600 fill-red-600" />
        </div>
      )}

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-sharks-red animate-ping" />
      )}
    </button>
  )
}
