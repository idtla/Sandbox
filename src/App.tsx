import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { MeasurePage } from './pages/MeasurePage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  const { pathname } = useLocation()
  const shellMod = pathname.startsWith('/analiticas')
    ? 'app-shell--analytics'
    : 'app-shell--medir'

  return (
    <div className={`app-shell ${shellMod}`}>
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
