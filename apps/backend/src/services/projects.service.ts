import { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';
import type { DependencyType, Role, WorkState } from '../generated/prisma/client';

type CreateProjectInput = {
  name: string;
  code: string;
  description?: string;
  budgetTotal: number;
  currency?: string;
  startDate?: Date;
  endDate?: Date;
};

type CreateTeamInput = {
  name: string;
  leadId: string;
  color?: string;
};

type CreateEpicInput = {
  projectId: string;
  name: string;
  code: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
};

type CreateTaskInput = {
  epicId: string;
  name: string;
  description?: string;
  teamId?: string;
  startDate?: Date;
  endDate?: Date;
};

type CreateSubtaskInput = {
  taskId: string;
  name: string;
  description?: string;
  state?: WorkState;
  progress?: number;
  startDate?: Date;
  endDate?: Date;
  durationDays?: number;
  estimatedHours?: number;
};

type DashboardProject = Prisma.ProjectGetPayload<{
  include: {
    epics: {
      include: {
        tasks: {
          include: {
            subtasks: true;
          };
        };
      };
    };
    snapshots: true;
    costLedgers: true;
  };
}>;

type ExportProject = Prisma.ProjectGetPayload<{
  include: {
    epics: {
      include: {
        tasks: {
          include: {
            subtasks: {
              include: {
                assignments: {
                  include: {
                    user: true;
                  };
                };
              };
            };
            team: true;
          };
        };
      };
    };
  };
}>;

type ExportEpic = ExportProject['epics'][number];
type ExportTask = ExportEpic['tasks'][number];
type ExportSubtask = ExportTask['subtasks'][number];
type ExportAssignment = ExportSubtask['assignments'][number];

type ExportRow = {
  proyecto: string;
  epic: string;
  tarea: string;
  subtarea: string;
  estado: string;
  porcentaje: number | null;
  equipo: string;
  asignado: string;
  color: string;
  costeHora: string;
  fechaInicio?: Date | null;
  fechaFin?: Date | null;
};

export class ProjectsService {
  static listForUser(userId: string, role: Role) {
    if (role === 'PMO') {
      return prisma.project.findMany({
        orderBy: { createdAt: 'desc' },
      });
    }

    return prisma.project.findMany({
      where: {
        teams: {
          some: {
            memberships: {
              some: {
                userId,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static createProject(input: CreateProjectInput) {
    return prisma.project.create({
      data: {
        name: input.name,
        code: input.code,
        description: input.description,
        startDate: input.startDate,
        endDate: input.endDate,
        budgetTotal: new Prisma.Decimal(input.budgetTotal),
        currency: input.currency ?? 'EUR',
      },
    });
  }

  static createTeam(projectId: string, data: CreateTeamInput) {
    return prisma.team.create({
      data: {
        ...data,
        projectId,
      },
    });
  }

  static addMember(teamId: string, userId: string, projectId: string, hourlyRate?: number) {
    return prisma.teamMembership.upsert({
      where: {
        userId_teamId_projectId: { userId, teamId, projectId },
      },
      create: {
        teamId,
        userId,
        projectId,
        hourlyRate: hourlyRate ? new Prisma.Decimal(hourlyRate) : undefined,
      },
      update: {
        hourlyRate: hourlyRate ? new Prisma.Decimal(hourlyRate) : undefined,
      },
    });
  }

  static createEpic(data: CreateEpicInput) {
    return prisma.epic.create({ data });
  }

  static createTask(data: CreateTaskInput) {
    return prisma.task.create({ data });
  }

  static createSubtask(data: CreateSubtaskInput) {
    return prisma.subtask.create({ data });
  }

  static updateSubtask(subtaskId: string, data: Record<string, unknown>) {
    return prisma.subtask.update({
      where: { id: subtaskId },
      data,
    });
  }

  static assignSubtask(
    subtaskId: string,
    userId: string,
    color: string,
    hourlyRate: number,
    allocation = 1,
  ) {
    return prisma.subtaskAssignment.upsert({
      where: {
        subtaskId_userId: {
          subtaskId,
          userId,
        },
      },
      create: {
        subtaskId,
        userId,
        color,
        hourlyRate: new Prisma.Decimal(hourlyRate),
        allocation,
      },
      update: {
        color,
        hourlyRate: new Prisma.Decimal(hourlyRate),
        allocation,
      },
    });
  }

  static createDependency(
    blockerId: string,
    blockedId: string,
    type: DependencyType = 'FINISH_START',
  ) {
    return prisma.dependency.create({
      data: { blockerId, blockedId, type },
    });
  }

  static async dashboard(projectId: string) {
    const project = (await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        epics: {
          include: {
            tasks: {
              include: {
                subtasks: true,
              },
            },
          },
        },
        snapshots: {
          orderBy: { periodStart: 'desc' },
          take: 6,
        },
        costLedgers: {
          orderBy: { month: 'desc' },
          take: 6,
        },
      },
    })) as DashboardProject | null;

    if (!project) {
      throw new Error('Proyecto no encontrado');
    }

    const subtasks = project.epics.flatMap((epic: typeof project.epics[number]) =>
      epic.tasks.flatMap((task: typeof epic.tasks[number]) => task.subtasks),
    );
    type SubtaskNode = (typeof subtasks)[number];

    const total = subtasks.length || 1;
    const done = subtasks.filter((s: SubtaskNode) => s.state === 'DONE').length;
    const late = subtasks.filter((s: SubtaskNode) => s.state === 'LATE').length;
    const inProgress = subtasks.filter((s: SubtaskNode) => s.state === 'IN_PROGRESS').length;
    const progress =
      subtasks.reduce((acc: number, curr: SubtaskNode) => acc + (curr.progress ?? 0), 0) / total;

    return {
      project: {
        id: project.id,
        name: project.name,
        code: project.code,
        budgetTotal: project.budgetTotal,
        progress,
      },
      stats: {
        totalSubtasks: total,
        done,
        inProgress,
        late,
        completionPct: progress,
      },
      snapshots: project.snapshots,
      costs: project.costLedgers,
    };
  }

  static async exportDeliverables(projectId: string) {
    const data = (await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        epics: {
          include: {
            tasks: {
              include: {
                subtasks: {
                  include: {
                    assignments: {
                      include: {
                        user: true,
                      },
                    },
                  },
                },
                team: true,
              },
            },
          },
        },
      },
    })) as ExportProject | null;

    if (!data) {
      throw new Error('Proyecto no encontrado');
    }

    const rows: ExportRow[] = [];
    const epics = data.epics as ExportEpic[];
    epics.forEach((epic: ExportEpic) => {
      epic.tasks.forEach((task: ExportTask) => {
        task.subtasks.forEach((subtask: ExportSubtask) => {
          if (subtask.assignments.length === 0) {
            rows.push({
              proyecto: data.name,
              epic: epic.name,
              tarea: task.name,
              subtarea: subtask.name,
              estado: subtask.state,
              porcentaje: subtask.progress ?? null,
              equipo: task.team?.name ?? '',
              asignado: '',
              color: '',
              costeHora: '',
              fechaInicio: subtask.startDate,
              fechaFin: subtask.endDate,
            });
          }
          subtask.assignments.forEach((assignment: ExportAssignment) => {
            rows.push({
              proyecto: data.name,
              epic: epic.name,
              tarea: task.name,
              subtarea: subtask.name,
              estado: subtask.state,
              porcentaje: subtask.progress ?? null,
              equipo: task.team?.name ?? '',
              asignado: assignment.user.name,
              color: assignment.color,
              costeHora: assignment.hourlyRate?.toString() ?? '',
              fechaInicio: subtask.startDate,
              fechaFin: subtask.endDate,
            });
          });
        });
      });
    });

    return rows;
  }

  static async plan(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        teams: {
          include: {
            lead: {
              select: { id: true, name: true, color: true },
            },
          },
        },
        epics: {
          include: {
            tasks: {
              include: {
                team: true,
                subtasks: {
                  include: {
                    assignments: {
                      include: {
                        user: {
                          select: {
                            id: true,
                            name: true,
                            color: true,
                          },
                        },
                      },
                    },
                    dependencies: true,
                    blockedBy: true,
                  },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!project) {
      throw new Error('Proyecto no encontrado');
    }
    return project;
  }
}
