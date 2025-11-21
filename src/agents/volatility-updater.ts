import axios from "axios";
import { RequestContext } from "@a2a-js/sdk/server";
import { BaseAgentExecutor } from "../a2a/server-factory.js";
import { A2AClientHelper } from "../a2a/client-helper.js";
import { HederaClient } from "../blockchain/hedera-client.js";
import { config } from "../config/index.js";
import { ethers } from "ethers";

export class VolatilityUpdaterExecutor extends BaseAgentExecutor {
  private hederaClient: HederaClient;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.hederaClient = new HederaClient();
  }

  startPeriodicUpdates() {
    console.log("🔄 Starting periodic volatility updates (every 30 seconds)...");

    this.updateInterval = setInterval(async () => {
      try {
        await this.performVolatilityUpdate();
      } catch (error: any) {
        console.error("Error in periodic update:", error.message);
      }
    }, 300000); // 30 seconds
  }

  stopPeriodicUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  async processRequest(context: RequestContext): Promise<any> {
    return await this.performVolatilityUpdate();
  }

  private async performVolatilityUpdate() {
    console.log("\n⏰ [Agent 1] Volatility Updater: Starting update cycle...");

    // Step 1: Get volatility recommendation from Agent 2 (A2A)
    console.log("📞 Requesting volatility recommendation from Agent 2...");
    const advisorUrl = `http://localhost:${config.agents.volatilityAdvisor.port}/.well-known/agent-card.json`;

    let volatilityBps = 50; // Default fallback

    try {
      const recommendation = await A2AClientHelper.sendMessage(
        advisorUrl,
        "recommend_volatility",
        {}
      );

      if (recommendation.volatilityBps) {
        volatilityBps = recommendation.volatilityBps;
        console.log(`✅ Received recommendation: ${volatilityBps} bps`);
      }
    } catch (error: any) {
      console.error("⚠️  Agent 2 unavailable, using default:", error.message);
    }

    // Step 2: Fetch Pyth price data
    console.log("📡 Fetching Pyth oracle data...");
    try {
      const url = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${config.pyth.hbarPriceFeedId.slice(
        2
      )}&encoding=hex`;
             
      const { data } = await axios.get(url);
      if (!data?.parsed || data.parsed.length === 0) {
        throw new Error("No Pyth price data available");
      }

      const priceUpdateBytes = "0x" + data.binary.data[0];


      // Step 3: Update on-chain volatility
      console.log(
        `⛓️  Updating on-chain volatility to ${volatilityBps} bps...`
      );
      const receipt = await this.hederaClient.updateVolatility(
        priceUpdateBytes,
        config.pyth.hbarPriceFeedId,
        volatilityBps,
      );

      console.log(`✅ Volatility updated! TX: ${receipt?.hash}`);

      // Get updated data
      const volData = await this.hederaClient.getVolatilityData(
        config.pyth.hbarPriceFeedId
      );

      return {
        success: true,
        volatilityBps: Number(volData.volatilityBps),
        price: Number(volData.price),
        timestamp: Number(volData.timestamp),
        txHash: receipt?.hash,
      };
    } catch (error: any) {
      console.error("❌ Update failed:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
