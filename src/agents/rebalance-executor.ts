import { RequestContext } from "@a2a-js/sdk/server";
import { BaseAgentExecutor } from "../a2a/server-factory.js";
import { HederaClient } from "../blockchain/hedera-client.js";
import { RebalanceRequest } from "../types/index.js";

export class RebalanceExecutorAgent extends BaseAgentExecutor {
  private hederaClient: HederaClient;

  constructor() {
    super();
    this.hederaClient = new HederaClient();
  }

  async processRequest(context: RequestContext): Promise<any> {
    const requestData: RebalanceRequest = JSON.parse(
      context.userMessage.parts[0].text || "{}"
    );

    console.log("\n⚡ [Agent 5] Rebalance Executor: Executing rebalance...");

    const {
      vaultAddress,
      hbarAddress,
      usdcAddress,
      targetAllocationHBAR,
      targetAllocationUSDC,
      volatilityThreshold,
      priceFeedId,
    } = requestData;

    try {
      const receipt = await this.hederaClient.executeRebalance(
        vaultAddress,
        hbarAddress,
        usdcAddress,
        targetAllocationHBAR,
        targetAllocationUSDC,
        volatilityThreshold,
        priceFeedId
      );

      console.log(`✅ Rebalance executed! TX: ${receipt?.hash}`);
      console.log(`Gas used: ${receipt?.gasUsed.toString()}`);

      // Get final balances
      const { hbarBalance, usdcBalance } = await this.hederaClient.getVaultBalances(vaultAddress);

      return {
        success: true,
        txHash: receipt?.hash,
        gasUsed: receipt?.gasUsed.toString(),
        finalBalances: {
          hbar: hbarBalance.toString(),
          usdc: usdcBalance.toString(),
        },
      };
    } catch (error: any) {
      console.error("❌ Rebalance execution failed:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
