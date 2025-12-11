import { useEffect, useMemo, useState } from 'react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { useProjectsList, useProjectDashboard, useProjectPlan } from '../hooks/useProjects';
import { ProjectSidebar } from '../components/ProjectSidebar';
import { DashboardSummary } from '../components/DashboardSummary';
import { GanttBoard } from '../components/GanttBoard';
import { exportProject } from '../api/projects';

export const DashboardPage = () => {
  const { data: projects, isLoading: loadingProjects } = useProjectsList();
  const [selectedProject, setSelectedProject] = useState<string>();

  useEffect(() => {
    if (!selectedProject && projects?.length) {
      setSelectedProject(projects[0].id);
    }
  }, [projects, selectedProject]);

  const dashboardQuery = useProjectDashboard(selectedProject);
  const planQuery = useProjectPlan(selectedProject);

  const handleExport = async (format: 'csv' | 'xlsx') => {
    if (!selectedProject) return;
    const blob = await exportProject(selectedProject, format);
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `proyecto-${selectedProject}.${format}`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const content = useMemo(() => {
    if (!selectedProject) {
      return (
        <Box
          sx={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            display: 'flex',
          }}
        >
          <Typography color="text.secondary">
            Selecciona o crea un proyecto para empezar.
          </Typography>
        </Box>
      );
    }

    if (dashboardQuery.isLoading || planQuery.isLoading) {
      return (
        <Box
          sx={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            display: 'flex',
          }}
        >
          <CircularProgress />
        </Box>
      );
    }

    return (
      <Stack spacing={3} sx={{ flex: 1, p: 3, overflow: 'hidden' }}>
        <Typography variant="h5">
          {dashboardQuery.data?.project.name}{' '}
          <Typography component="span" color="text.secondary">
            ({dashboardQuery.data?.project.code})
          </Typography>
        </Typography>
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3}>
          <Box sx={{ flex: 1 }}>
            <DashboardSummary data={dashboardQuery.data} />
          </Box>
          <Box sx={{ flex: 1.2 }}>
            <Typography variant="subtitle1" mb={1}>
              Gantt visual
            </Typography>
            <GanttBoard epics={planQuery.data?.epics} />
          </Box>
        </Stack>
      </Stack>
    );
  }, [dashboardQuery.data, dashboardQuery.isLoading, planQuery.data, planQuery.isLoading, selectedProject]);

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <ProjectSidebar
        projects={projects}
        selectedId={selectedProject}
        onSelect={setSelectedProject}
        onExport={handleExport}
      />
      {loadingProjects ? (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (
        content
      )}
    </Box>
  );
};
