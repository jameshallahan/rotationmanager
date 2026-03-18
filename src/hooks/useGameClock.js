import { useEffect, useRef } from 'react'
import { useGameStore } from '../store/useGameStore'

export function useGameClock() {
  const isRunning = useGameStore(s => s.gameState.isRunning)
  const tickSecond = useGameStore(s => s.tickSecond)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        tickSecond()
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [isRunning, tickSecond])
}
