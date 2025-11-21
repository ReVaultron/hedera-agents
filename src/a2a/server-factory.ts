import express from "express";
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

export class A2AServerFactory {
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
    const expressApp = appBuilder.setupRoutes(express());

    expressApp.listen(port, () => {
      console.log(`✅ ${agentCard.name} started on http://localhost:${port}`);
    });
  }
}

export abstract class BaseAgentExecutor implements AgentExecutor {
  abstract processRequest(context: RequestContext): Promise<any>;

  async execute(
    requestContext: RequestContext,
    eventBus: ExecutionEventBus
  ): Promise<void> {
    try {
      const result = await this.processRequest(requestContext);

      const responseMessage = {
        kind: "message" as const,
        messageId: uuidv4(),
        role: "agent" as const,
        parts: [{ kind: "text" as const, text: JSON.stringify(result) }],
        contextId: requestContext.contextId,
      };

      eventBus.publish(responseMessage);
      eventBus.finished();
    } catch (error: any) {
      const errorMessage = {
        kind: "message" as const,
        messageId: uuidv4(),
        role: "agent" as const,
        parts: [
          {
            kind: "text" as const,
            text: JSON.stringify({ error: error.message }),
          },
        ],
        contextId: requestContext.contextId,
      };

      eventBus.publish(errorMessage);
      eventBus.finished();
    }
  }

  cancelTask = async (): Promise<void> => {};
}
