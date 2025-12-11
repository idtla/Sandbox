import { useQuery } from '@tanstack/react-query';
import { fetchDashboard, fetchPlan, fetchProjects } from '../api/projects';

export const useProjectsList = () =>
  useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    staleTime: 1000 * 60,
  });

export const useProjectDashboard = (projectId?: string) =>
  useQuery({
    queryKey: ['dashboard', projectId],
    queryFn: () => fetchDashboard(projectId!),
    enabled: Boolean(projectId),
    staleTime: 1000 * 30,
  });

export const useProjectPlan = (projectId?: string) =>
  useQuery({
    queryKey: ['plan', projectId],
    queryFn: () => fetchPlan(projectId!),
    enabled: Boolean(projectId),
    staleTime: 1000 * 30,
  });
