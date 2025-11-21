// From javascript_database blueprint - updated for AI Observability SDK
import {
  workspaces,
  projects,
  apiKeys,
  telemetryLogs,
  users,
  workspaceMembers,
  type Workspace,
  type InsertWorkspace,
  type Project,
  type InsertProject,
  type ApiKey,
  type InsertApiKey,
  type TelemetryLog,
  type InsertTelemetryLog,
  type User,
  type UpsertUser,
  type WorkspaceMember,
  type InsertWorkspaceMember,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User>;

  // Workspaces
  getWorkspaces(): Promise<Workspace[]>;
  getWorkspace(id: string): Promise<Workspace | undefined>;
  getWorkspaceBySlug(slug: string): Promise<Workspace | undefined>;
  getUserWorkspaces(userId: string): Promise<Workspace[]>;
  createWorkspace(workspace: InsertWorkspace): Promise<Workspace>;
  updateWorkspace(id: string, data: Partial<Workspace>): Promise<void>;
  deleteWorkspace(id: string): Promise<void>;

  // Workspace Members
  getWorkspaceMembers(workspaceId: string): Promise<(WorkspaceMember & { user: User })[]>;
  getWorkspaceMember(workspaceId: string, userId: string): Promise<WorkspaceMember | undefined>;
  addWorkspaceMember(member: InsertWorkspaceMember): Promise<WorkspaceMember>;
  updateWorkspaceMemberRole(workspaceId: string, userId: string, role: string): Promise<void>;
  removeWorkspaceMember(workspaceId: string, userId: string): Promise<void>;

  // Projects
  getProjects(workspaceId: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  // API Keys
  getApiKeys(workspaceId: string): Promise<ApiKey[]>;
  getApiKey(id: string): Promise<ApiKey | undefined>;
  getApiKeyByKey(key: string): Promise<ApiKey | undefined>;
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  updateApiKeyLastUsed(id: string): Promise<void>;
  deleteApiKey(id: string): Promise<void>;

  // Telemetry Logs
  getTelemetryLogs(workspaceId: string, filters?: {
    projectId?: string;
    environment?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<TelemetryLog[]>;
  getTelemetryLog(id: string): Promise<TelemetryLog | undefined>;
  createTelemetryLog(log: InsertTelemetryLog): Promise<TelemetryLog>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(userData: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  // Workspaces
  async getWorkspaces(): Promise<Workspace[]> {
    return await db.select().from(workspaces).orderBy(desc(workspaces.createdAt));
  }

  async getUserWorkspaces(userId: string): Promise<Workspace[]> {
    const memberships = await db
      .select({ workspace: workspaces })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.userId, userId))
      .orderBy(desc(workspaces.createdAt));
    
    return memberships.map(m => m.workspace);
  }

  async getWorkspace(id: string): Promise<Workspace | undefined> {
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id));
    return workspace || undefined;
  }

  async getWorkspaceBySlug(slug: string): Promise<Workspace | undefined> {
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.slug, slug));
    return workspace || undefined;
  }

  async createWorkspace(insertWorkspace: InsertWorkspace): Promise<Workspace> {
    const [workspace] = await db
      .insert(workspaces)
      .values(insertWorkspace)
      .returning();
    return workspace;
  }

  async updateWorkspace(id: string, data: Partial<Workspace>): Promise<void> {
    await db
      .update(workspaces)
      .set(data)
      .where(eq(workspaces.id, id));
  }

  async deleteWorkspace(id: string): Promise<void> {
    await db.delete(workspaces).where(eq(workspaces.id, id));
  }

  // Workspace Members
  async getWorkspaceMembers(workspaceId: string): Promise<(WorkspaceMember & { user: User })[]> {
    const members = await db
      .select()
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(eq(workspaceMembers.workspaceId, workspaceId))
      .orderBy(desc(workspaceMembers.createdAt));
    
    return members.map(m => ({
      ...m.workspace_members,
      user: m.users,
    }));
  }

  async getWorkspaceMember(workspaceId: string, userId: string): Promise<WorkspaceMember | undefined> {
    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      );
    return member || undefined;
  }

  async addWorkspaceMember(memberData: InsertWorkspaceMember): Promise<WorkspaceMember> {
    const [member] = await db
      .insert(workspaceMembers)
      .values(memberData)
      .returning();
    return member;
  }

  async updateWorkspaceMemberRole(workspaceId: string, userId: string, role: string): Promise<void> {
    await db
      .update(workspaceMembers)
      .set({ role })
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      );
  }

  async removeWorkspaceMember(workspaceId: string, userId: string): Promise<void> {
    await db
      .delete(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      );
  }

  // Projects
  async getProjects(workspaceId: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId))
      .orderBy(desc(projects.createdAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db
      .insert(projects)
      .values(insertProject)
      .returning();
    return project;
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // API Keys
  async getApiKeys(workspaceId: string): Promise<ApiKey[]> {
    return await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.workspaceId, workspaceId))
      .orderBy(desc(apiKeys.createdAt));
  }

  async getApiKey(id: string): Promise<ApiKey | undefined> {
    const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.id, id));
    return apiKey || undefined;
  }

  async getApiKeyByKey(key: string): Promise<ApiKey | undefined> {
    const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.key, key));
    return apiKey || undefined;
  }

  async createApiKey(insertApiKey: InsertApiKey): Promise<ApiKey> {
    const [apiKey] = await db
      .insert(apiKeys)
      .values(insertApiKey)
      .returning();
    return apiKey;
  }

  async updateApiKeyLastUsed(id: string): Promise<void> {
    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, id));
  }

  async deleteApiKey(id: string): Promise<void> {
    await db.delete(apiKeys).where(eq(apiKeys.id, id));
  }

  // Telemetry Logs
  async getTelemetryLogs(
    workspaceId: string,
    filters?: {
      projectId?: string;
      environment?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<TelemetryLog[]> {
    const conditions = [eq(telemetryLogs.workspaceId, workspaceId)];

    if (filters?.projectId) {
      conditions.push(eq(telemetryLogs.projectId, filters.projectId));
    }

    if (filters?.environment) {
      conditions.push(eq(telemetryLogs.environment, filters.environment));
    }

    if (filters?.startDate) {
      conditions.push(gte(telemetryLogs.timestamp, filters.startDate));
    }

    if (filters?.endDate) {
      conditions.push(lte(telemetryLogs.timestamp, filters.endDate));
    }

    return await db
      .select()
      .from(telemetryLogs)
      .where(and(...conditions))
      .orderBy(desc(telemetryLogs.timestamp))
      .limit(1000); // Limit to most recent 1000 logs
  }

  async getTelemetryLog(id: string): Promise<TelemetryLog | undefined> {
    const [log] = await db.select().from(telemetryLogs).where(eq(telemetryLogs.id, id));
    return log || undefined;
  }

  async createTelemetryLog(insertLog: InsertTelemetryLog): Promise<TelemetryLog> {
    const [log] = await db
      .insert(telemetryLogs)
      .values(insertLog)
      .returning();
    return log;
  }
}

export const storage = new DatabaseStorage();
