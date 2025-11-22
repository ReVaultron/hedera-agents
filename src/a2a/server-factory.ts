
import express from "express";
import cors from "cors";
import type { AgentCard } from "@a2a-js/sdk";
import {
  AgentExecutor,
  RequestContext,
  ExecutionEventBus,
  DefaultRequestHandler,
  InMemoryTaskStore,
} from "@a2a-js/sdk/server";
import { A2AExpressApp } from "@a2a-js/sdk/server/express";
import { v4 as uuidv4 } from "uuid";

// Enhanced status tracking with actual results
interface AgentStatus {
  lastUpdate?: any;
  lastCheck?: Date;
  isRunning: boolean;
  error?: string;
  executionCount: number;
  lastExecutionTime?: Date;
}

export class A2AServerFactory {
  private static agentStatuses = new Map<string, AgentStatus>();
  private static agentResults = new Map<string, any>();

  // 🔥 NEW: Helper to normalize agent names consistently
  private static normalizeAgentName(name: string): string {
    // Remove "Agent", "Executor", extra spaces and convert to key format
    return name
      .replace(/Agent$/i, '')
      .replace(/Executor$/i, '')
      .trim()
      .replace(/\s+/g, ''); // Remove all spaces
  }

  static createServer(
    agentCard: AgentCard,
    executor: AgentExecutor,
    port: number
  ): void {
    const requestHandler = new DefaultRequestHandler(
      agentCard,
      new InMemoryTaskStore(),
      executor
    );

    const appBuilder = new A2AExpressApp(requestHandler);
    const app = express();
    console.log('agentCard', agentCard)
    // 🔥 Use normalized name for storage
    const normalizedName = this.normalizeAgentName(agentCard.name);

    // Initialize status for this agent
    this.agentStatuses.set(normalizedName, {
      isRunning: true,
      executionCount: 0,
      lastCheck: new Date(),
    });

    // Enable CORS
    app.use(
      cors({
        origin: [
          "http://localhost:3000",
          "http://localhost:8080",
          "http://127.0.0.1:3000",
          "http://127.0.0.1:8080",
          "https://revaultron.vercel.app",
        ],
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type"],
        credentials: true,
      })
    );

    app.options("*", cors());
    app.use(express.json());

    // STATUS ENDPOINT - Returns comprehensive agent info
    app.get("/status", (req, res) => {
      // 🔥 Look up using normalized name
      const status = this.agentStatuses.get(normalizedName) || {
        isRunning: true,
        executionCount: 0,
      };

      const latestResult = this.agentResults.get(normalizedName);

      res.json({
        agent: agentCard.name, // Return original name for display
        normalizedKey: normalizedName, // Include for debugging
        status: "online",
        timestamp: new Date().toISOString(),
        ...status,
        latestResult,
      });
    });

    // RESULTS ENDPOINT
    app.get("/latest-result", (req, res) => {
      const result = this.agentResults.get(normalizedName);
      
      if (!result) {
        return res.status(404).json({
          error: "No results available yet",
          message: "Agent hasn't executed any operations",
          normalizedKey: normalizedName,
        });
      }

      res.json({
        agent: agentCard.name,
        normalizedKey: normalizedName,
        timestamp: new Date().toISOString(),
        result,
      });
    });

    // HEALTH ENDPOINT
    app.get("/health", (req, res) => {
      const status = this.agentStatuses.get(normalizedName);
      res.json({
        healthy: status?.isRunning ?? true,
        agent: agentCard.name,
        normalizedKey: normalizedName,
      });
    });

    // Setup A2A routes
    const expressApp = appBuilder.setupRoutes(app);

    // Start server
    expressApp.listen(port, () => {
      console.log(`✅ ${agentCard.name} started on http://localhost:${port}`);
      console.log(`   🔑 Storage key: ${normalizedName}`);
      console.log(`   📊 Status: http://localhost:${port}/status`);
    });
  }
  
