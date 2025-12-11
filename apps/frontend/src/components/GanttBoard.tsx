import { format, addWeeks, differenceInCalendarDays } from 'date-fns';
import { Box, Chip, Stack, Typography } from '@mui/material';
import type { Epic } from '../types';

type Props = {
  epics?: Epic[];
};

export const GanttBoard = ({ epics }: Props) => {
  const allSubtasks = epics?.flatMap((epic) =>
    epic.tasks.flatMap((task) => task.subtasks),
  );

  const startDates = allSubtasks
    ?.map((subtask) => subtask.startDate)
    .filter(Boolean)
    .map((date) => new Date(date!));
  const endDates = allSubtasks
    ?.map((subtask) => subtask.endDate)
    .filter(Boolean)
    .map((date) => new Date(date!));

  const globalStart = startDates?.length ? new Date(Math.min(...startDates.map(Number))) : new Date();
  const globalEnd = endDates?.length
    ? new Date(Math.max(...endDates.map(Number)))
    : addWeeks(globalStart, 4);

  const totalDays = Math.max(differenceInCalendarDays(globalEnd, globalStart), 1);

  const getLeft = (date?: string) => {
    if (!date) return 0;
    const diff = differenceInCalendarDays(new Date(date), globalStart);
    return (diff / totalDays) * 100;
  };

  const getWidth = (start?: string, end?: string) => {
    if (!start || !end) return 4;
    const diff = differenceInCalendarDays(new Date(end), new Date(start));
    return Math.max((diff / totalDays) * 100, 2);
  };

  return (
    <Box sx={{ width: '100%', overflowX: 'auto', pb: 4 }}>
      <Stack direction="row" spacing={2} sx={{ minWidth: 900 }}>
        <Box sx={{ width: 280 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Entregables
          </Typography>
        </Box>
        <Box sx={{ flex: 1, position: 'relative' }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
            {Array.from({ length: 5 }).map((_, index) => (
              <Typography key={index} variant="caption" color="text.secondary">
                {format(addWeeks(globalStart, index), 'dd MMM')}
              </Typography>
            ))}
          </Stack>
        </Box>
      </Stack>

      {epics?.map((epic) => (
        <Box key={epic.id} sx={{ display: 'flex', minWidth: 900, mb: 2 }}>
          <Box sx={{ width: 280, pr: 2 }}>
            <Typography fontWeight={600}>{epic.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {epic.code}
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }}>
            {epic.tasks.map((task) => (
              <Stack key={task.id} sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography fontWeight={500}>{task.name}</Typography>
                  {task.team && (
                    <Chip
                      label={task.team.name}
                      size="small"
                      sx={{
                        bgcolor: `${task.team.color}20`,
                        color: task.team.color,
                      }}
                    />
                  )}
                </Stack>
                <Box sx={{ position: 'relative', height: 36, mt: 1 }}>
                  {task.subtasks.map((subtask) => (
                    <Box
                      key={subtask.id}
                      sx={{
                        position: 'absolute',
                        left: `${getLeft(subtask.startDate)}%`,
                        width: `${getWidth(subtask.startDate, subtask.endDate)}%`,
                        minWidth: 40,
                        top: 0,
                        height: 32,
                        borderRadius: 999,
                        bgcolor:
                          subtask.state === 'DONE'
                            ? 'secondary.main'
                            : subtask.state === 'LATE'
                            ? '#f44336'
                            : 'primary.main',
                        opacity: 0.9,
                        display: 'flex',
                        alignItems: 'center',
                        px: 1.5,
                        color: '#fff',
                      }}
                    >
                      <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>
                        {subtask.name}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Stack>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
};
