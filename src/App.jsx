import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useGameStore } from './store/useGameStore'
import Home from './screens/Home'
import RosterSetup from './screens/RosterSetup'
import PreMatchSetup from './screens/PreMatchSetup'
import GameDay from './screens/GameDay'
import Reports from './screens/Reports'

export default function App() {
  const loadData = useGameStore(s => s.loadData)

  useEffect(() => {
    loadData()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/roster" element={<RosterSetup />} />
        <Route path="/match/setup" element={<PreMatchSetup />} />
        <Route path="/match/live" element={<GameDay />} />
        <Route path="/match/report" element={<Reports />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
