import { useEffect, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { DashboardPage } from './pages/DashboardPage';
import { LoginCard } from './components/LoginCard';
import { useSessionStore } from './store/session';
import { meRequest } from './api/auth';

function App() {
  const user = useSessionStore((state) => state.user);
  const setSession = useSessionStore((state) => state.setSession);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await meRequest();
        setSession({ user: profile });
      } catch (error) {
        console.info('Sesión no iniciada', error);
      } finally {
        setCheckingSession(false);
      }
    };
    fetchProfile();
  }, [setSession]);

  if (checkingSession) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at 10% 20%, #e8f0fe, #f7f9fc)',
        }}
      >
        <LoginCard />
      </Box>
    );
  }

  return <DashboardPage />;
}

export default App;
