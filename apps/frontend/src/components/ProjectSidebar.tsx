import {
  Box,
  Button,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import type { Project } from '../types';

type Props = {
  projects?: Project[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onExport?: (format: 'csv' | 'xlsx') => void;
};

export const ProjectSidebar = ({ projects, selectedId, onSelect, onExport }: Props) => {
  return (
    <Stack
      spacing={3}
      sx={{
        width: 320,
        flexShrink: 0,
        borderRight: '1px solid rgba(26,115,232,0.12)',
        height: '100%',
        p: 3,
        bgcolor: 'background.paper',
      }}
    >
      <Box>
        <Typography variant="h6">Proyectos</Typography>
        <Typography variant="body2" color="text.secondary">
          Selecciona un proyecto para ver su avance.
        </Typography>
      </Box>

      <List dense sx={{ overflowY: 'auto', flex: 1 }}>
        {projects?.map((project) => (
          <ListItemButton
            key={project.id}
            selected={selectedId === project.id}
            onClick={() => onSelect(project.id)}
            sx={{
              borderRadius: 2,
              mb: 1,
              border: '1px solid transparent',
              '&.Mui-selected': {
                borderColor: 'primary.main',
                bgcolor: 'rgba(26,115,232,0.08)',
              },
            }}
          >
            <ListItemText
              primary={
                <Stack direction="row" justifyContent="space-between">
                  <Typography fontWeight={600}>{project.name}</Typography>
                  {project.progress !== undefined && (
                    <Typography variant="caption" color="text.secondary">
                      {(project.progress * 100).toFixed(0)}%
                    </Typography>
                  )}
                </Stack>
              }
              secondary={project.code}
            />
          </ListItemButton>
        ))}
      </List>

      {selectedId && (
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => onExport?.('csv')}
            fullWidth
          >
            CSV
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={() => onExport?.('xlsx')}
            fullWidth
          >
            XLSX
          </Button>
        </Stack>
      )}
    </Stack>
  );
};
