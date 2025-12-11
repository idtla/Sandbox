import { api } from './client';
import type { DashboardMetrics, Epic, Project } from '../types';

export const fetchProjects = () => api.get('projects').json<Project[]>();

export const fetchDashboard = (projectId: string) =>
  api.get(`projects/${projectId}/dashboard`).json<DashboardMetrics>();

export const fetchPlan = (projectId: string) =>
  api.get(`projects/${projectId}/plan`).json<{
    id: string;
    name: string;
    code: string;
    teams: Array<{ id: string; name: string; color: string }>;
    epics: Epic[];
  }>();

export const exportProject = (projectId: string, format: 'csv' | 'xlsx' = 'csv') =>
  api
    .get(`projects/${projectId}/export`, { searchParams: { format } })
    .blob();
