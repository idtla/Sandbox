import { Request, Response } from 'express';
import { z } from 'zod';
import { ProjectsService } from '../services/projects.service';
import { Role, WorkState, DependencyType } from '../generated/prisma/client';

const ensureParam = (value: string | undefined, label: string) => {
  if (!value) {
    throw new Error(`Parámetro ${label} obligatorio`);
  }
  return value;
};

const projectSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  description: z.string().optional(),
  budgetTotal: z.number().nonnegative(),
  currency: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const teamSchema = z.object({
  name: z.string().min(2),
  leadId: z.string().uuid(),
  color: z.string().optional(),
});

const memberSchema = z.object({
  userId: z.string().uuid(),
  hourlyRate: z.number().positive().optional(),
});

const epicSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  description: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const taskSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  teamId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const subtaskSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  state: z.nativeEnum(WorkState).optional(),
  progress: z.number().min(0).max(1).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  durationDays: z.number().int().positive().optional(),
  estimatedHours: z.number().positive().optional(),
});

const assignmentSchema = z.object({
  userId: z.string().uuid(),
  color: z.string(),
  hourlyRate: z.number().positive(),
  allocation: z.number().min(0).max(1).optional(),
});

const dependencySchema = z.object({
  blockerId: z.string().uuid(),
  blockedId: z.string().uuid(),
  type: z.nativeEnum(DependencyType).optional(),
});

export class ProjectsController {
  static async list(req: Request, res: Response) {
    const projects = await ProjectsService.listForUser(req.user!.id, req.user!.role as Role);
    res.json(projects);
  }

  static async create(req: Request, res: Response) {
    const body = projectSchema.parse(req.body);
    const project = await ProjectsService.createProject({
      name: body.name,
      code: body.code,
      description: body.description,
      budgetTotal: body.budgetTotal,
      currency: body.currency,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    });
    res.status(201).json(project);
  }

  static async createTeam(req: Request, res: Response) {
    const projectId = ensureParam(req.params.projectId, 'projectId');
    const body = teamSchema.parse(req.body);
    const team = await ProjectsService.createTeam(projectId, body);
    res.status(201).json(team);
  }

  static async addMember(req: Request, res: Response) {
    const projectId = ensureParam(req.params.projectId, 'projectId');
    const teamId = ensureParam(req.params.teamId, 'teamId');
    const body = memberSchema.parse(req.body);
    const membership = await ProjectsService.addMember(
      teamId,
      body.userId,
      projectId,
      body.hourlyRate,
    );
    res.status(201).json(membership);
  }

  static async createEpic(req: Request, res: Response) {
    const projectId = ensureParam(req.params.projectId, 'projectId');
    const body = epicSchema.parse(req.body);
    const epic = await ProjectsService.createEpic({
      name: body.name,
      code: body.code,
      description: body.description,
      projectId,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    });
    res.status(201).json(epic);
  }

  static async createTask(req: Request, res: Response) {
    const epicId = ensureParam(req.params.epicId, 'epicId');
    const body = taskSchema.parse(req.body);
    const task = await ProjectsService.createTask({
      name: body.name,
      description: body.description,
      teamId: body.teamId,
      epicId,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    });
    res.status(201).json(task);
  }

  static async createSubtask(req: Request, res: Response) {
    const taskId = ensureParam(req.params.taskId, 'taskId');
    const body = subtaskSchema.parse(req.body);
    const subtask = await ProjectsService.createSubtask({
      name: body.name,
      description: body.description,
      state: body.state,
      progress: body.progress,
      estimatedHours: body.estimatedHours,
      durationDays: body.durationDays,
      taskId,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    });
    res.status(201).json(subtask);
  }

  static async updateSubtask(req: Request, res: Response) {
    const subtaskId = ensureParam(req.params.subtaskId, 'subtaskId');
    const body = subtaskSchema.partial().parse(req.body);
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.state !== undefined) updateData.state = body.state;
    if (body.progress !== undefined) updateData.progress = body.progress;
    if (body.durationDays !== undefined) updateData.durationDays = body.durationDays;
    if (body.estimatedHours !== undefined) updateData.estimatedHours = body.estimatedHours;
    if (body.startDate !== undefined) updateData.startDate = new Date(body.startDate);
    if (body.endDate !== undefined) updateData.endDate = new Date(body.endDate);
    const updated = await ProjectsService.updateSubtask(subtaskId, updateData);
    res.json(updated);
  }

  static async assignSubtask(req: Request, res: Response) {
    const subtaskId = ensureParam(req.params.subtaskId, 'subtaskId');
    const body = assignmentSchema.parse(req.body);
    const assignment = await ProjectsService.assignSubtask(
      subtaskId,
      body.userId,
      body.color,
      body.hourlyRate,
      body.allocation,
    );
    res.status(201).json(assignment);
  }

  static async addDependency(req: Request, res: Response) {
    const body = dependencySchema.parse(req.body);
    const dependency = await ProjectsService.createDependency(
      body.blockerId,
      body.blockedId,
      body.type,
    );
    res.status(201).json(dependency);
  }

  static async dashboard(req: Request, res: Response) {
    const projectId = ensureParam(req.params.projectId, 'projectId');
    const dashboard = await ProjectsService.dashboard(projectId);
    res.json(dashboard);
  }

  static async plan(req: Request, res: Response) {
    const projectId = ensureParam(req.params.projectId, 'projectId');
    const plan = await ProjectsService.plan(projectId);
    res.json(plan);
  }

  static async export(req: Request, res: Response) {
    const projectId = ensureParam(req.params.projectId, 'projectId');
    const format = req.query.format === 'xlsx' ? 'xlsx' : 'csv';
    const rows = await ProjectsService.exportDeliverables(projectId);

    if (format === 'csv') {
      const { Parser } = await import('json2csv');
      const parser = new Parser();
      const csv = parser.parse(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=project-${projectId}.csv`);
      return res.send(csv);
    }

    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Gantt');
    sheet.columns = [
      { header: 'Proyecto', key: 'proyecto' },
      { header: 'Epic', key: 'epic' },
      { header: 'Tarea', key: 'tarea' },
      { header: 'Subtarea', key: 'subtarea' },
      { header: 'Estado', key: 'estado' },
      { header: 'Porcentaje', key: 'porcentaje' },
      { header: 'Equipo', key: 'equipo' },
      { header: 'Asignado', key: 'asignado' },
      { header: 'Color', key: 'color' },
      { header: 'Coste/Hora', key: 'costeHora' },
      { header: 'Fecha inicio', key: 'fechaInicio' },
      { header: 'Fecha fin', key: 'fechaFin' },
    ];
    sheet.addRows(
      rows.map((row) => ({
        ...row,
        fechaInicio: row.fechaInicio ? new Date(row.fechaInicio).toISOString().slice(0, 10) : '',
        fechaFin: row.fechaFin ? new Date(row.fechaFin).toISOString().slice(0, 10) : '',
      })),
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=project-${projectId}.xlsx`,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    await workbook.xlsx.write(res);
    res.end();
  }
}
