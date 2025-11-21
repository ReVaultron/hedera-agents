import { Message, Task } from "@a2a-js/sdk";

export interface VolatilityData {
  volatilityBps: bigint;
  price: bigint;
  confidence: bigint;
  expo: number;
  timestamp: bigint;
}

export interface RebalanceRequest {
  vaultAddress: string;
  hbarAddress: string;
  usdcAddress: string;
  targetAllocationHBAR: number;
  targetAllocationUSDC: number;
  volatilityThreshold: number;
  priceFeedId: string;
}

export interface AllocationRecommendation {
  hbarAllocation: number;
  usdcAllocation: number;
  confidence: number;
  reasoning: string;
}

export interface VolatilityRecommendation {
  volatilityBps: number;
  confidence: number;
  reasoning: string;
}

export interface A2AAgentConfig {
  name: string;
  description: string;
  port: number;
  url: string;
  skills: Array<{
    id: string;
    name: string;
    description: string;
    tags: string[];
  }>;
}
