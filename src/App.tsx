import { Navigate, Route, Routes } from 'react-router-dom'
import { SleepTrackingProvider } from './context/sleepTracking'
import { AppShell } from './layout/AppShell'
import { getSessionToken } from './api/client'
import { AccessPage } from './pages/AccessPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { DashboardPage } from './pages/DashboardPage'
import { FamilyPage } from './pages/FamilyPage'
import { ManualEntryPage } from './pages/ManualEntryPage'
import { RegisterPage } from './pages/RegisterPage'
import { SettingsPage } from './pages/SettingsPage'
import { TimerPage } from './pages/TimerPage'

function RequireOtpSession({ children }: { children: JSX.Element }) {
  const token = getSessionToken()
  if (!token) return <Navigate to="/acceso" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/acceso" element={<AccessPage />} />
      <Route path="/registro" element={<RegisterPage />} />
      <Route
        element={
          <RequireOtpSession>
            <SleepTrackingProvider>
              <AppShell />
            </SleepTrackingProvider>
          </RequireOtpSession>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="medir" element={<TimerPage />} />
        <Route path="analiticas" element={<AnalyticsPage />} />
        <Route path="registro-manual" element={<ManualEntryPage />} />
        <Route path="ajustes" element={<SettingsPage />} />
        <Route path="familia" element={<FamilyPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
