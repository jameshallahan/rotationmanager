import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/useGameStore'
import { ChevronRight, Users, Clock } from 'lucide-react'

function SharksWordmark() {
  return (
    <div className="flex flex-col items-center gap-5">
      <img
        src="/sharks-logo.png"
        alt="Sorrento Sharks"
        className="h-40 w-auto drop-shadow-2xl"
        onError={e => { e.target.style.display = 'none' }}
      />
      <div className="font-condensed font-medium text-gray-500 text-sm tracking-[0.4em] uppercase">RotationIQ</div>
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const currentMatch = useGameStore(s => s.currentMatch)
  const matches = useGameStore(s => s.matches)

  return (
    <div className="h-screen flex items-center justify-center bg-sharks-dark overflow-hidden">
      {/* Background texture */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'repeating-linear-gradient(45deg, #CC0000 0, #CC0000 1px, transparent 0, transparent 50%)',
        backgroundSize: '20px 20px'
      }} />

      <div className="relative flex flex-col items-center gap-10 w-full max-w-sm px-6">
        <SharksWordmark />

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => navigate(currentMatch ? '/match/live' : '/match/setup')}
            className="w-full h-16 bg-sharks-red hover:bg-red-700 text-white font-condensed font-black text-xl uppercase tracking-widest rounded-xl flex items-center justify-between px-6 transition-colors shadow-lg shadow-red-900/30"
          >
            {currentMatch ? `Resume: vs ${currentMatch.opponent}` : 'New Match'}
            <ChevronRight size={24} />
          </button>

          {currentMatch && (
            <button
              onClick={() => navigate('/match/setup')}
              className="w-full h-14 bg-sharks-surface hover:bg-sharks-surface2 text-white font-condensed font-bold text-base uppercase tracking-widest rounded-xl flex items-center justify-between px-6 transition-colors border border-sharks-border"
            >
              New Match
              <ChevronRight size={20} className="text-gray-400" />
            </button>
          )}

          <button
            onClick={() => navigate('/roster')}
            className="w-full h-14 bg-sharks-surface hover:bg-sharks-surface2 text-white font-condensed font-bold text-base uppercase tracking-widest rounded-xl flex items-center justify-between px-6 transition-colors border border-sharks-border"
          >
            <span className="flex items-center gap-3">
              <Users size={18} className="text-gray-400" />
              Roster
            </span>
            <ChevronRight size={20} className="text-gray-400" />
          </button>

          {matches.length > 0 && (
            <button
              onClick={() => navigate('/match/report')}
              className="font-condensed font-semibold text-gray-500 hover:text-gray-300 text-sm uppercase tracking-wider transition-colors flex items-center gap-2 mx-auto"
            >
              <Clock size={14} />
              Match History
            </button>
          )}
        </div>

        {/* Last match card */}
        {currentMatch && (
          <div className="w-full rounded-xl bg-sharks-surface border border-sharks-border p-4">
            <div className="font-condensed text-xs text-gray-500 uppercase tracking-wider mb-1">Active Match</div>
            <div className="font-condensed font-bold text-white text-lg">vs {currentMatch.opponent}</div>
            <div className="font-condensed text-gray-400 text-sm">{currentMatch.venue || 'Venue TBC'} · {currentMatch.date}</div>
          </div>
        )}
      </div>
    </div>
  )
}
