import { Card, CardContent, LinearProgress, Stack, Typography } from '@mui/material';
import type { DashboardMetrics } from '../types';
import { format } from 'date-fns';

type Props = {
  data?: DashboardMetrics;
};

const StatCard = ({
  label,
  value,
  helper,
  color,
}: {
  label: string;
  value: string;
  helper?: string;
  color?: string;
}) => (
  <Card>
    <CardContent>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" color={color ?? 'text.primary'}>
        {value}
      </Typography>
      {helper && (
        <Typography variant="body2" color="text.secondary">
          {helper}
        </Typography>
      )}
    </CardContent>
  </Card>
);

export const DashboardSummary = ({ data }: Props) => {
  if (!data) {
    return null;
  }

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            Avance del proyecto
          </Typography>
          <Typography variant="h4" fontWeight={600}>
            {(data.stats.completionPct * 100).toFixed(1)}%
          </Typography>
          <LinearProgress
            variant="determinate"
            value={data.stats.completionPct * 100}
            sx={{ mt: 2, borderRadius: 8, height: 8 }}
            color="primary"
          />
        </CardContent>
      </Card>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ '& > *': { flex: 1 } }}
      >
        <StatCard
          label="Subtareas totales"
          value={String(data.stats.totalSubtasks)}
          helper={`${data.stats.done} completadas`}
        />
        <StatCard
          label="En progreso"
          value={String(data.stats.inProgress)}
          helper={`${data.stats.late} con retraso`}
          color="#f9a825"
        />
        <StatCard
          label="Budget"
          value={`${Number(data.project.progress * 100).toFixed(0)}% EV`}
          helper={`Total ${data.project.code}`}
          color="#00bfa6"
        />
      </Stack>

      <Card>
        <CardContent>
          <Typography variant="subtitle1">Histórico reciente</Typography>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {data.snapshots.map((snapshot) => (
              <Stack
                key={snapshot.id}
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Typography>
                  {format(new Date(snapshot.periodStart), 'dd MMM')} ·{' '}
                  {snapshot.rangeType.toLowerCase()}
                </Typography>
                <Typography fontWeight={600}>
                  {(snapshot.percentComplete * 100).toFixed(0)}%
                </Typography>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};
