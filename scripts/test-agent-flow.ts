import { A2AClientHelper } from "../src/a2a/client-helper.js";
import { config } from "../src/config/index.js";
import { HederaClient } from "../src/blockchain/hedera-client.js";
import { ethers } from "ethers";

async function testCompleteAgentFlow() {
  console.log("🧪 Testing Complete A2A Agent Flow\n");
  console.log("=".repeat(60));

  const hederaClient = new HederaClient();

  try {
    // Test 1: Volatility Advisor
    console.log("\n📊 TEST 1: Volatility Advisor Agent");
    console.log("-".repeat(60));
    const advisorUrl = `http://localhost:${config.agents.volatilityAdvisor.port}/.well-known/agent-card.json`;
    const volatilityRec = await A2AClientHelper.sendMessage(
      advisorUrl,
      "recommend_volatility",
      {}
    );
    console.log("✅ Response:", JSON.stringify(volatilityRec, null, 2));

    // Test 2: Volatility Updater
    console.log("\n⛓️  TEST 2: Volatility Updater Agent");
    console.log("-".repeat(60));
    const updaterUrl = `http://localhost:${config.agents.volatilityUpdater.port}/.well-known/agent-card.json`;
    const updateResult = await A2AClientHelper.sendMessage(
      updaterUrl,
      "update_volatility",
      {}
    );
    console.log("✅ Response:", JSON.stringify(updateResult, null, 2));

    // Wait a bit for on-chain update
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Test 3: Allocation Strategist
    console.log("\n🎯 TEST 3: Allocation Strategist Agent");
    console.log("-".repeat(60));
    const strategistUrl = `http://localhost:${config.agents.allocationStrategist.port}/.well-known/agent-card.json`;
    const allocationRec = await A2AClientHelper.sendMessage(
      strategistUrl,
      "recommend_allocation",
      { volatility: updateResult.volatilityBps || 50 }
    );
    console.log("✅ Response:", JSON.stringify(allocationRec, null, 2));

    // ADDED: Fund vault if empty
    console.log("\n💰 SETUP: Checking and funding vault for testing");
    console.log("-".repeat(60));
    
    const balancesBefore = await hederaClient.getVaultBalances(config.contracts.userVault);
    console.log("Current vault balance:", ethers.formatEther(balancesBefore.hbarBalance), "HBAR");
    
    if (balancesBefore.hbarBalance === 0n) {
      console.log("⚠️  Vault is empty, funding with 1 HBAR for testing...");
      const fundingAmount = ethers.parseEther("1");
      const wallet = new ethers.Wallet(config.hedera.privateKey, hederaClient.provider);
      
      const fundTx = await wallet.sendTransaction({
        to: config.contracts.userVault,
        value: fundingAmount,
        gasLimit: 100000
      });
      await fundTx.wait();
      
      const balancesAfter = await hederaClient.getVaultBalances(config.contracts.userVault);
      console.log("✅ Funded vault with", ethers.formatEther(balancesAfter.hbarBalance), "HBAR");
    } else {
      console.log("✅ Vault already has funds");
    }

    // Test 4: Rebalance Checker (which may trigger Agent 5)
    console.log("\n⚖️  TEST 4: Rebalance Checker Agent");
    console.log("-".repeat(60));
    const checkerUrl = `http://localhost:${config.agents.rebalanceChecker.port}/.well-known/agent-card.json`;
    const rebalanceResult = await A2AClientHelper.sendMessage(
      checkerUrl,
      "check_rebalancing",
      {}
    );
    console.log("✅ Response:", JSON.stringify(rebalanceResult, null, 2));

    // Test 5: Verify final state
    console.log("\n🔍 TEST 5: Verify Final On-Chain State");
    console.log("-".repeat(60));
    const volData = await hederaClient.getVolatilityData(
      config.pyth.hbarPriceFeedId
    );
    console.log("Current Volatility (on-chain):", Number(volData.volatilityBps), "bps");
    console.log("Price:", Number(volData.price) / 1e8, "USD");
    console.log("Timestamp:", new Date(Number(volData.timestamp) * 1000).toISOString());

    const balances = await hederaClient.getVaultBalances(config.contracts.userVault);
    console.log("\nVault Balances:");
    console.log("  HBAR:", ethers.formatEther(balances.hbarBalance), "HBAR");
    console.log("  USDC:", ethers.formatUnits(balances.usdcBalance, 6), "USDC");

    console.log("\n" + "=".repeat(60));
    console.log("✅ ALL TESTS COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(60) + "\n");

  } catch (error: any) {
    console.error("\n❌ TEST FAILED:", error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
console.log("⏳ Waiting 5 seconds for agents to start...\n");
setTimeout(async () => {
  await testCompleteAgentFlow();
  console.log("\n👋 Test completed. Press Ctrl+C to exit.");
}, 5000);
