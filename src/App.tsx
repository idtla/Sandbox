import { Navigate, Route, Routes } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { MeasurePage } from './pages/MeasurePage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  return (
    <div className="app-shell">
      <main className="main-area">
        <Routes>
          <Route path="/" element={<MeasurePage />} />
          <Route path="/analiticas" element={<AnalyticsPage />} />
          <Route path="/ajustes" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}
