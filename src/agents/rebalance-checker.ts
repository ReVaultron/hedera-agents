import { RequestContext } from "@a2a-js/sdk/server";
import { BaseAgentExecutor } from "../a2a/server-factory.js";
import { A2AClientHelper } from "../a2a/client-helper.js";
import { HederaClient } from "../blockchain/hedera-client.js";
import { config } from "../config/index.js";
import { ethers } from "ethers";

export class RebalanceCheckerExecutor extends BaseAgentExecutor {
  private hederaClient: HederaClient;

  constructor() {
    super();
    this.hederaClient = new HederaClient();
  }

  async processRequest(context: RequestContext): Promise<any> {
    const requestData = JSON.parse(context.userMessage.parts[0].text || "{}");

    console.log("\n🔍 [Agent 3] Rebalance Checker: Analyzing portfolio...");

    const HBAR_ADDRESS = ethers.ZeroAddress;
    const USDC_ADDRESS = config.contracts.usdc;
    const VAULT_ADDRESS = config.contracts.userVault;

    // Step 1: Get current volatility
    const volData = await this.hederaClient.getVolatilityData(
      config.pyth.hbarPriceFeedId
    );
    const currentVolatility = Number(volData.volatilityBps);

    console.log(`📊 Current Volatility: ${currentVolatility} bps`);

    // Step 2: Get allocation recommendation from Agent 4 (A2A)
    console.log("📞 Requesting allocation strategy from Agent 4...");
    const strategistUrl = `http://localhost:${config.agents.allocationStrategist.port}/.well-known/agent-card.json`;

    let targetAllocationHBAR = 0;
    let targetAllocationUSDC = 10000;

    try {
      const allocation = await A2AClientHelper.sendMessage(
        strategistUrl,
        "recommend_allocation",
        { volatility: currentVolatility }
      );

      if (allocation.hbarAllocation && allocation.usdcAllocation) {
        targetAllocationHBAR = allocation.hbarAllocation;
        targetAllocationUSDC = allocation.usdcAllocation;
        console.log(
          `✅ Target Allocation: ${targetAllocationHBAR / 100}% HBAR / ${targetAllocationUSDC / 100}% USDC`
        );
      }
    } catch (error: any) {
      console.error("⚠️  Agent 4 unavailable, using default:", error.message);
    }

    // Step 3: Check if rebalancing is needed
    console.log("⚖️  Checking rebalancing requirement...");

    const volatilityThreshold = 1; // Very low for testing

    const { needed, drift } = await this.hederaClient.needsRebalancing(
      VAULT_ADDRESS,
      HBAR_ADDRESS,
      USDC_ADDRESS,
      targetAllocationHBAR,
      targetAllocationUSDC,
      volatilityThreshold,
      config.pyth.hbarPriceFeedId
    );

    console.log(`Rebalancing Needed: ${needed}`);
    console.log(`Drift: ${Number(drift)} bps (${Number(drift) / 100}%)`);

    // Step 4: If rebalancing needed, call Agent 5 (A2A)
    if (needed) {
      console.log("🚨 Rebalancing required! Calling Agent 5...");

      const executorUrl = `http://localhost:${config.agents.rebalanceExecutor.port}/.well-known/agent-card.json`;

      try {
        const executionResult = await A2AClientHelper.sendMessage(
          executorUrl,
          "execute_rebalance",
          {
            vaultAddress: VAULT_ADDRESS,
            hbarAddress: HBAR_ADDRESS,
            usdcAddress: USDC_ADDRESS,
            targetAllocationHBAR,
            targetAllocationUSDC,
            volatilityThreshold,
            priceFeedId: config.pyth.hbarPriceFeedId,
          }
        );

        console.log("✅ Rebalancing executed successfully!");
        return {
          rebalancingNeeded: needed,
          drift: Number(drift),
          executed: true,
          executionResult,
        };
      } catch (error: any) {
        console.error("❌ Rebalancing execution failed:", error.message);
        return {
          rebalancingNeeded: needed,
          drift: Number(drift),
          executed: false,
          error: error.message,
        };
      }
    } else {
      console.log("✅ Portfolio is balanced. No action needed.");
      return {
        rebalancingNeeded: needed,
        drift: Number(drift),
        executed: false,
      };
    }
  }
}
