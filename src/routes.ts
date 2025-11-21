import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createHmac } from "crypto";
import passport from "passport";
import { nanoid } from "nanoid";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, hashPassword } from "./auth";
import {
  insertWorkspaceSchema,
  insertProjectSchema,
  insertApiKeySchema,
  insertTelemetryLogSchema,
  insertWorkspaceMemberSchema,
  type User,
} from "@shared/schema";
import { z } from "zod";
import {
  createCheckoutSession,
  cancelSubscription,
  getSubscription,
  constructWebhookEvent,
  calculateTrialEndDate,
  stripe,
  STRIPE_CONFIG,
  createCustomerPortalSession,
} from "./stripe";
import type Stripe from "stripe";

// WebSocket clients tracking with workspace scoping
interface WebSocketClient {
  socket: WebSocket;
  workspaceId: string;
}

const wsClients = new Set<WebSocketClient>();

// WebSocket token generation and validation
const SOCKET_SECRET = process.env.SESSION_SECRET || "default-socket-secret";
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

function generateSocketToken(workspaceId: string): string {
  const payload = {
    workspaceId,
    exp: Date.now() + TOKEN_EXPIRY,
  };
  const data = JSON.stringify(payload);
  const signature = createHmac("sha256", SOCKET_SECRET)
    .update(data)
    .digest("hex");
  return Buffer.from(JSON.stringify({ data, signature })).toString("base64");
}

function validateSocketToken(token: string): { valid: boolean; workspaceId?: string } {
  try {
    const decoded = JSON.parse(Buffer.from(token, "base64").toString());
    const { data, signature } = decoded;
    
    // Verify signature
    const expectedSignature = createHmac("sha256", SOCKET_SECRET)
      .update(data)
      .digest("hex");
    
    if (signature !== expectedSignature) {
      return { valid: false };
    }
    
    // Check expiry
    const payload = JSON.parse(data);
    if (payload.exp < Date.now()) {
      return { valid: false };
    }
    
    return { valid: true, workspaceId: payload.workspaceId };
  } catch (error) {
    return { valid: false };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

  // ==================== Auth Routes ====================
  
  // Registration schema
  const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  });

  // Register new user
  app.post('/api/auth/register', async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Hash password and create user
      const passwordHash = await hashPassword(data.password);
      const user = await storage.createUser({
        email: data.email,
        passwordHash,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        profileImageUrl: null,
      });

      // Generate unique workspace slug with collision resistance
      let workspace;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (attempts < maxAttempts) {
        try {
          const slug = `workspace-${nanoid(10)}`;
          if (attempts > 0) {
            console.log(`Workspace slug collision, retry attempt ${attempts}`);
          }
          workspace = await storage.createWorkspace({
            name: `${user.firstName || user.email.split('@')[0]}'s Workspace`,
            slug,
            ownerId: user.id,
          });
          break; // Success, exit loop
        } catch (error: any) {
          // If it's a unique constraint violation, try again
          if (error.code === '23505' && attempts < maxAttempts - 1) {
            attempts++;
            continue;
          }
          // Log final failure and throw with clearer message
          console.error(`Failed to create workspace after ${attempts + 1} attempts:`, error);
          throw new Error("Unable to create workspace. Please try again or contact support if this persists.");
        }
      }

      if (!workspace) {
        return res.status(500).json({ error: "Unable to create workspace. Please try again or contact support." });
      }

      // Add user as owner of the workspace
      await storage.addWorkspaceMember({
        workspaceId: workspace.id,
        userId: user.id,
        role: "owner",
      });

      // Log user in
      req.login(user, (err) => {
        if (err) {
          console.error("Login error after registration:", err);
          return res.status(500).json({ error: "Registration successful but login failed. Please try logging in manually." });
        }
        res.json({ 
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          },
          workspace
        });
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid registration data", details: error.errors });
      }
      res.status(500).json({ error: error.message || "Failed to register user. Please try again." });
    }
  });

  // Login
  app.post('/api/auth/login', (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ error: "Authentication error" });
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid email or password" });
      }
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Login failed" });
        }
        res.json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        });
      });
    })(req, res, next);
  });

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  // Get current user
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    } catch (error: any) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Middleware to validate workspace membership
  const requireWorkspaceMembership = async (req: any, res: Response, next: Function) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Get workspace ID from params or query
      const workspaceId = req.params.workspaceId || req.query.workspaceId || req.body.workspaceId;
      if (!workspaceId) {
        return res.status(400).json({ error: "Workspace ID required" });
      }

      // Verify user is a member of this workspace
      const member = await storage.getWorkspaceMember(workspaceId, userId);
      if (!member) {
        return res.status(403).json({ error: "Access denied to this workspace" });
      }

      // Attach member info to request
      req.workspaceMember = member;
      req.workspaceId = workspaceId;
      next();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // Middleware to validate API key for telemetry ingestion
  const validateApiKey = async (req: Request, res: Response, next: Function) => {
    const apiKey = req.headers["x-api-key"] as string;

    if (!apiKey) {
      return res.status(401).json({ error: "API key required" });
    }

    const key = await storage.getApiKeyByKey(apiKey);
    if (!key) {
      return res.status(401).json({ error: "Invalid API key" });
    }

    // Update last used timestamp
    await storage.updateApiKeyLastUsed(key.id);

    // Attach workspace ID to request for later use
    (req as any).workspaceId = key.workspaceId;
    next();
  };

  // ==================== Workspaces ====================
  app.get("/api/workspaces", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const workspaces = await storage.getUserWorkspaces(userId);
      res.json(workspaces);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/workspaces/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const workspace = await storage.getWorkspace(req.params.id);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
      }
      
      // Verify user has access to this workspace
      const member = await storage.getWorkspaceMember(req.params.id, userId);
      if (!member) {
        return res.status(403).json({ error: "Access denied to this workspace" });
      }
      
      res.json(workspace);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate WebSocket token for a workspace (requires API key)
  app.post("/api/workspaces/:workspaceId/socket-token", validateApiKey, async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const authenticatedWorkspaceId = (req as any).workspaceId;
      
      // Verify the API key belongs to this workspace
      if (workspaceId !== authenticatedWorkspaceId) {
        return res.status(403).json({ error: "Access denied to this workspace" });
      }
      
      // Verify workspace exists
      const workspace = await storage.getWorkspace(workspaceId);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
      }
      
      // Generate signed token
      const token = generateSocketToken(workspaceId);
      res.json({ token });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/workspaces", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const data = insertWorkspaceSchema.parse(req.body);
      
      // Check if slug already exists
      const existing = await storage.getWorkspaceBySlug(data.slug);
      if (existing) {
        return res.status(400).json({ error: "Workspace slug already exists" });
      }

      // Create workspace with owner
      const workspace = await storage.createWorkspace({
        ...data,
        ownerId: userId,
      });

      // Automatically add creator as owner member
      await storage.addWorkspaceMember({
        workspaceId: workspace.id,
        userId: userId,
        role: "owner",
      });

      res.status(201).json(workspace);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/workspaces/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const workspace = await storage.getWorkspace(req.params.id);
      
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
      }

      // Only owner can delete workspace
      if (workspace.ownerId !== userId) {
        return res.status(403).json({ error: "Only workspace owner can delete" });
      }

      await storage.deleteWorkspace(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== Workspace Members ====================
  app.get("/api/workspaces/:workspaceId/members", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { workspaceId } = req.params;

      // Verify user has access to this workspace
      const member = await storage.getWorkspaceMember(workspaceId, userId);
      if (!member) {
        return res.status(403).json({ error: "Access denied to this workspace" });
      }

      const members = await storage.getWorkspaceMembers(workspaceId);
      res.json(members);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/workspaces/:workspaceId/members", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { workspaceId } = req.params;

      // Verify requester is owner or admin
      const requesterMember = await storage.getWorkspaceMember(workspaceId, userId);
      if (!requesterMember || (requesterMember.role !== "owner" && requesterMember.role !== "admin")) {
        return res.status(403).json({ error: "Only owners and admins can add members" });
      }

      const data = insertWorkspaceMemberSchema.parse(req.body);
      const newMember = await storage.addWorkspaceMember({
        ...data,
        workspaceId,
      });

      res.status(201).json(newMember);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/workspaces/:workspaceId/members/:targetUserId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { workspaceId, targetUserId } = req.params;
      const { role } = req.body;

      // Verify requester is owner or admin
      const requesterMember = await storage.getWorkspaceMember(workspaceId, userId);
      if (!requesterMember || (requesterMember.role !== "owner" && requesterMember.role !== "admin")) {
        return res.status(403).json({ error: "Only owners and admins can update roles" });
      }

      await storage.updateWorkspaceMemberRole(workspaceId, targetUserId, role);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/workspaces/:workspaceId/members/:targetUserId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { workspaceId, targetUserId } = req.params;

      // Verify requester is owner or admin
      const requesterMember = await storage.getWorkspaceMember(workspaceId, userId);
      if (!requesterMember || (requesterMember.role !== "owner" && requesterMember.role !== "admin")) {
        return res.status(403).json({ error: "Only owners and admins can remove members" });
      }

      await storage.removeWorkspaceMember(workspaceId, targetUserId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== Projects ====================
  app.get("/api/projects", isAuthenticated, requireWorkspaceMembership, async (req: any, res) => {
    try {
      // Use verified workspaceId from middleware
      const workspaceId = req.workspaceId;
      const projects = await storage.getProjects(workspaceId);
      res.json(projects);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/projects", isAuthenticated, requireWorkspaceMembership, async (req: any, res) => {
    try {
      // Parse body but ignore client-supplied workspaceId
      const data = insertProjectSchema.parse(req.body);
      
      // Always use verified workspaceId from middleware, never trust client input
      const projectData = {
        ...data,
        workspaceId: req.workspaceId, // Overwrite with verified workspace
      };

      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      // Get project to verify workspace membership
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Verify user has access to this workspace
      const userId = req.user.id;
      const member = await storage.getWorkspaceMember(project.workspaceId, userId);
      if (!member) {
        return res.status(403).json({ error: "Access denied to this workspace" });
      }

      await storage.deleteProject(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== API Keys ====================
  app.get("/api/api-keys", isAuthenticated, requireWorkspaceMembership, async (req: any, res) => {
    try {
      // Use verified workspaceId from middleware
      const workspaceId = req.workspaceId;
      const keys = await storage.getApiKeys(workspaceId);
      res.json(keys);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/api-keys", isAuthenticated, requireWorkspaceMembership, async (req: any, res) => {
    try {
      // Parse body but ignore client-supplied workspaceId
      const data = insertApiKeySchema.parse(req.body);
      
      // Always use verified workspaceId from middleware, never trust client input
      const apiKeyData = {
        ...data,
        workspaceId: req.workspaceId, // Overwrite with verified workspace
      };

      const apiKey = await storage.createApiKey(apiKeyData);
      res.status(201).json(apiKey);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/api-keys/:id", isAuthenticated, async (req: any, res) => {
    try {
      // Get API key to verify workspace membership
      const apiKey = await storage.getApiKey(req.params.id);
      if (!apiKey) {
        return res.status(404).json({ error: "API key not found" });
      }

      // Verify user has access to this workspace
      const userId = req.user.id;
      const member = await storage.getWorkspaceMember(apiKey.workspaceId, userId);
      if (!member) {
        return res.status(403).json({ error: "Access denied to this workspace" });
      }

      await storage.deleteApiKey(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== Telemetry Logs ====================
  app.get("/api/telemetry", isAuthenticated, requireWorkspaceMembership, async (req: any, res) => {
    try {
      // Use verified workspaceId from middleware
      const workspaceId = req.workspaceId;
      const { projectId, environment, startDate, endDate } = req.query;

      // If projectId filter is provided, verify it belongs to this workspace
      if (projectId) {
        const project = await storage.getProject(projectId as string);
        if (!project || project.workspaceId !== workspaceId) {
          return res.status(403).json({ error: "Project does not belong to this workspace" });
        }
      }

      const filters: any = {};
      if (projectId) filters.projectId = projectId as string;
      if (environment) filters.environment = environment as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);

      const logs = await storage.getTelemetryLogs(workspaceId, filters);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Export telemetry logs
  app.get("/api/telemetry/export", isAuthenticated, requireWorkspaceMembership, async (req: any, res) => {
    try {
      // Use verified workspaceId from middleware
      const workspaceId = req.workspaceId;
      const { format = "json", projectId, environment, startDate, endDate } = req.query;
      
      // If projectId filter is provided, verify it belongs to this workspace
      if (projectId) {
        const project = await storage.getProject(projectId as string);
        if (!project || project.workspaceId !== workspaceId) {
          return res.status(403).json({ error: "Project does not belong to this workspace" });
        }
      }

      const filters: any = {};
      if (projectId) filters.projectId = projectId as string;
      if (environment) filters.environment = environment as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);

      const logs = await storage.getTelemetryLogs(workspaceId, filters);

      if (format === "csv") {
        // Helper function to properly escape CSV fields per RFC4180
        const escapeCSVField = (field: any): string => {
          if (field === null || field === undefined) return '""';
          let str = String(field);
          
          // Normalize line endings to CRLF per RFC4180
          str = str.replace(/\r\n/g, '\n'); // First normalize existing CRLF to LF
          str = str.replace(/\r/g, '\n');   // Then normalize CR to LF
          str = str.replace(/\n/g, '\r\n'); // Finally convert all LF to CRLF
          
          // Escape double quotes by doubling them
          str = str.replace(/"/g, '""');
          
          // Always wrap in quotes for consistency (RFC4180 allows this)
          return `"${str}"`;
        };

        // Generate CSV
        const headers = ["ID", "Timestamp", "Project ID", "Environment", "Model", "Prompt", "Response", "Tokens", "Cost", "Latency"];
        const csvRows = [headers.map(h => `"${h}"`).join(",")];
        
        logs.forEach(log => {
          const row = [
            escapeCSVField(log.id),
            escapeCSVField(log.timestamp),
            escapeCSVField(log.projectId || ""),
            escapeCSVField(log.environment || ""),
            escapeCSVField(log.model || ""),
            escapeCSVField(log.prompt || ""),
            escapeCSVField(log.response || ""),
            escapeCSVField(log.totalTokens || 0),
            escapeCSVField(log.cost || 0),
            escapeCSVField(log.latencyMs || 0)
          ];
          csvRows.push(row.join(","));
        });

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="telemetry-logs-${Date.now()}.csv"`);
        // RFC4180 requires trailing CRLF after last record
        res.send(csvRows.join("\r\n") + "\r\n");
      } else {
        // JSON format (default)
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="telemetry-logs-${Date.now()}.json"`);
        res.json(logs);
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Telemetry ingestion endpoint (requires API key)
  app.post("/api/telemetry/ingest", validateApiKey, async (req, res) => {
    try {
      const workspaceId = (req as any).workspaceId;
      const data = insertTelemetryLogSchema.parse({
        ...req.body,
        workspaceId,
      });

      const log = await storage.createTelemetryLog(data);

      // Broadcast to WebSocket clients subscribed to this workspace only
      const message = JSON.stringify({
        type: "new_log",
        data: log,
      });

      wsClients.forEach((client) => {
        if (client.workspaceId === log.workspaceId && client.socket.readyState === WebSocket.OPEN) {
          client.socket.send(message);
        }
      });

      res.status(201).json(log);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ==================== Stripe Subscription Routes ====================
  
  // Create Stripe checkout session
  app.post("/api/billing/create-checkout", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const userId = user.id!;
      const { workspaceId } = req.body;
      
      if (!workspaceId) {
        return res.status(400).json({ error: "Workspace ID is required" });
      }

      // Verify user has access to workspace
      const membership = await storage.getWorkspaceMember(workspaceId, userId);
      if (!membership) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Get workspace details
      const workspace = await storage.getWorkspace(workspaceId);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
      }

      if (!user.email) {
        return res.status(404).json({ error: "User email not found" });
      }

      const baseUrl = req.protocol + "://" + req.get("host");
      const successUrl = `${baseUrl}/dashboard?checkout=success`;
      const cancelUrl = `${baseUrl}/dashboard?checkout=cancel`;

      const session = await createCheckoutSession(
        workspaceId,
        workspace.stripeCustomerId,
        user.email,
        successUrl,
        cancelUrl
      );

      if (!session) {
        return res.status(500).json({ error: "Failed to create checkout session" });
      }

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Checkout error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get subscription status
  app.get("/api/billing/status", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const userId = user.id!;
      const { workspaceId } = req.query;
      
      if (!workspaceId || typeof workspaceId !== "string") {
        return res.status(400).json({ error: "Workspace ID is required" });
      }

      // Verify user has access to workspace
      const membership = await storage.getWorkspaceMember(workspaceId, userId);
      if (!membership) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Get workspace subscription status
      const workspace = await storage.getWorkspace(workspaceId);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
      }

      res.json({
        subscriptionStatus: workspace.subscriptionStatus || "trialing",
        trialEndsAt: workspace.trialEndsAt,
        stripeCustomerId: workspace.stripeCustomerId,
        stripeSubscriptionId: workspace.stripeSubscriptionId,
      });
    } catch (error: any) {
      console.error("Billing status error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Customer portal (manage subscription)
  app.post("/api/billing/customer-portal", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const userId = user.id!;
      const { workspaceId } = req.body;
      
      if (!workspaceId) {
        return res.status(400).json({ error: "Workspace ID is required" });
      }

      // Verify user has access to workspace
      const membership = await storage.getWorkspaceMember(workspaceId, userId);
      if (!membership) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Get workspace details
      const workspace = await storage.getWorkspace(workspaceId);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
      }

      if (!workspace.stripeCustomerId) {
        return res.status(400).json({ error: "No Stripe customer found" });
      }

      const baseUrl = req.protocol + "://" + req.get("host");
      const returnUrl = `${baseUrl}/dashboard/settings`;

      const session = await createCustomerPortalSession(
        workspace.stripeCustomerId,
        returnUrl
      );

      if (!session) {
        return res.status(500).json({ error: "Failed to create portal session" });
      }

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Customer portal error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Cancel subscription
  app.post("/api/billing/cancel", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const userId = user.id!;
      const { workspaceId } = req.body;
      
      if (!workspaceId) {
        return res.status(400).json({ error: "Workspace ID is required" });
      }

      // Verify user is workspace owner
      const workspace = await storage.getWorkspace(workspaceId);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
      }
      
      if (workspace.ownerId !== userId) {
        return res.status(403).json({ error: "Only workspace owner can cancel subscription" });
      }

      if (!workspace.stripeSubscriptionId) {
        return res.status(400).json({ error: "No active subscription found" });
      }

      await cancelSubscription(workspace.stripeSubscriptionId);

      // Update workspace status
      await storage.updateWorkspace(workspaceId, {
        subscriptionStatus: "canceled",
      });

      res.json({ success: true, message: "Subscription canceled" });
    } catch (error: any) {
      console.error("Cancel subscription error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Stripe webhook handler
  app.post("/api/webhooks/stripe", async (req, res) => {
    const signature = req.headers["stripe-signature"];

    if (!signature || typeof signature !== "string") {
      return res.status(400).send("Missing stripe-signature header");
    }

    try {
      // Construct the event using the raw body
      const event = constructWebhookEvent(
        (req as any).rawBody || req.body,
        signature
      );

      if (!event) {
        return res.status(400).send("Webhook Error: Failed to construct event");
      }

      // Handle the event
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const workspaceId = session.metadata?.workspaceId;
          
          if (workspaceId) {
            await storage.updateWorkspace(workspaceId, {
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              subscriptionStatus: "trialing",
              trialEndsAt: calculateTrialEndDate(),
            });
          }
          break;
        }

        case "customer.subscription.updated":
        case "customer.subscription.created": {
          const subscription = event.data.object as Stripe.Subscription;
          const workspaceId = subscription.metadata?.workspaceId;
          
          if (workspaceId) {
            await storage.updateWorkspace(workspaceId, {
              subscriptionStatus: subscription.status,
              stripeSubscriptionId: subscription.id,
            });
          }
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          const workspaceId = subscription.metadata?.workspaceId;
          
          if (workspaceId) {
            await storage.updateWorkspace(workspaceId, {
              subscriptionStatus: "canceled",
              stripeSubscriptionId: null,
            });
          }
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = typeof (invoice as any).subscription === 'string' 
            ? (invoice as any).subscription 
            : (invoice as any).subscription?.id;
          
          if (subscriptionId && stripe) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const workspaceId = subscription.metadata?.workspaceId;
            
            if (workspaceId) {
              await storage.updateWorkspace(workspaceId, {
                subscriptionStatus: "past_due",
              });
            }
          }
          break;
        }
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error("Webhook error:", error);
      res.status(400).send(`Webhook Error: ${error.message}`);
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // Set up WebSocket server for real-time log streaming
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    let client: WebSocketClient | null = null;

    // Wait for authentication message with token
    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === "subscribe" && message.token) {
          // Validate token
          const validation = validateSocketToken(message.token);
          
          if (!validation.valid || !validation.workspaceId) {
            ws.send(JSON.stringify({ 
              type: "error", 
              message: "Invalid or expired token" 
            }));
            ws.close();
            return;
          }

          // Create authenticated client
          client = {
            socket: ws,
            workspaceId: validation.workspaceId,
          };
          wsClients.add(client);

          // Send confirmation
          ws.send(JSON.stringify({ 
            type: "subscribed", 
            workspaceId: validation.workspaceId,
            message: "Subscribed to workspace logs" 
          }));
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", () => {
      if (client) {
        wsClients.delete(client);
      }
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      if (client) {
        wsClients.delete(client);
      }
    });

    // Send initial connection confirmation
    ws.send(JSON.stringify({ type: "connected", message: "WebSocket connected. Send subscribe message with valid token." }));
  });

  return httpServer;
}
