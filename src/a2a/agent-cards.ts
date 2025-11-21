import type { AgentCard } from "@a2a-js/sdk";
import { config } from "../config/index.js";

const baseUrl = (port: number) => `http://localhost:${port}`;

export const volatilityUpdaterCard: AgentCard = {
  name: "Volatility Updater Agent",
  description: "Updates on-chain volatility data every 30 seconds",
  protocolVersion: "0.3.0",
  version: "1.0.0",
  url: baseUrl(config.agents.volatilityUpdater.port),
  skills: [
    {
      id: "update-volatility",
      name: "Update Volatility",
      description: "Fetches recommended volatility and updates the blockchain",
      tags: ["blockchain", "volatility", "oracle"],
    },
  ],
  capabilities: {
    streaming: false,
    pushNotifications: false,
    stateTransitionHistory: false,
  },
};

export const volatilityAdvisorCard: AgentCard = {
  name: "Volatility Advisor Agent",
  description: "AI-powered volatility recommendation based on historical data",
  protocolVersion: "0.3.0",
  version: "1.0.0",
  url: baseUrl(config.agents.volatilityAdvisor.port),
  skills: [
    {
      id: "recommend-volatility",
      name: "Recommend Volatility",
      description: "Analyzes data and recommends optimal volatility value",
      tags: ["ai", "analysis", "recommendation"],
    },
  ],
  capabilities: {
    streaming: false,
    pushNotifications: false,
    stateTransitionHistory: false,
  },
};

export const rebalanceCheckerCard: AgentCard = {
  name: "Rebalance Checker Agent",
  description: "Checks if portfolio rebalancing is needed",
  protocolVersion: "0.3.0",
  version: "1.0.0",
  url: baseUrl(config.agents.rebalanceChecker.port),
  skills: [
    {
      id: "check-rebalancing",
      name: "Check Rebalancing",
      description: "Determines if rebalancing is required and triggers execution",
      tags: ["blockchain", "portfolio", "rebalancing"],
    },
  ],
  capabilities: {
    streaming: false,
    pushNotifications: false,
    stateTransitionHistory: false,
  },
};

export const allocationStrategistCard: AgentCard = {
  name: "Allocation Strategist Agent",
  description: "Provides optimal token allocation strategy",
  protocolVersion: "0.3.0",
  version: "1.0.0",
  url: baseUrl(config.agents.allocationStrategist.port),
  skills: [
    {
      id: "recommend-allocation",
      name: "Recommend Allocation",
      description: "Calculates best allocation based on market conditions",
      tags: ["ai", "strategy", "allocation"],
    },
  ],
  capabilities: {
    streaming: false,
    pushNotifications: false,
    stateTransitionHistory: false,
  },
};

export const rebalanceExecutorCard: AgentCard = {
  name: "Rebalance Executor Agent",
  description: "Executes portfolio rebalancing on-chain",
  protocolVersion: "0.3.0",
  version: "1.0.0",
  url: baseUrl(config.agents.rebalanceExecutor.port),
  skills: [
    {
      id: "execute-rebalance",
      name: "Execute Rebalance",
      description: "Performs the actual rebalancing transaction",
      tags: ["blockchain", "execution", "rebalancing"],
    },
  ],
  capabilities: {
    streaming: false,
    pushNotifications: false,
    stateTransitionHistory: false,
  },
};
