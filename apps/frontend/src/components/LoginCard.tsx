import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { loginRequest } from '../api/auth';
import { useSessionStore } from '../store/session';

export const LoginCard = () => {
  const setSession = useSessionStore((state) => state.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setError(null);
      setLoading(true);
      const response = await loginRequest(email, password);
      setSession(response);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo iniciar sesión, revisa tus datos.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        width: 360,
      }}
    >
      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h5">Panel PMO</Typography>
              <Typography color="text.secondary">
                Accede para gestionar proyectos y equipos.
              </Typography>
            </Box>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Correo"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <TextField
              label="Contraseña"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};
