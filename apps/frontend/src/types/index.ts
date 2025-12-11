export type Role = 'PMO' | 'LEAD';

export type WorkState = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'LATE';

export type DependencyType = 'FINISH_START' | 'START_START' | 'FINISH_FINISH';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  color: string;
  hourlyRate: number;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  description?: string;
  progress?: number;
  budgetTotal: string;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  lead: Pick<User, 'id' | 'name' | 'color'>;
}

export interface Subtask {
  id: string;
  name: string;
  description?: string;
  state: WorkState;
  progress: number;
  startDate?: string;
  endDate?: string;
  durationDays?: number;
  assignments: Array<{
    user: Pick<User, 'id' | 'name' | 'color'>;
    color: string;
    hourlyRate: string;
  }>;
}

export interface Task {
  id: string;
  name: string;
  team?: Team;
  startDate?: string;
  endDate?: string;
  subtasks: Subtask[];
}

export interface Epic {
  id: string;
  name: string;
  code: string;
  tasks: Task[];
}

export interface DashboardMetrics {
  project: { id: string; name: string; code: string; progress: number };
  stats: {
    totalSubtasks: number;
    done: number;
    inProgress: number;
    late: number;
    completionPct: number;
  };
  snapshots: Array<{
    id: string;
    rangeType: string;
    periodStart: string;
    percentComplete: number;
    actualCost?: string;
    plannedCost?: string;
  }>;
  costs: Array<{
    id: string;
    month: string;
    actualCost?: string;
    plannedCost?: string;
  }>;
}
