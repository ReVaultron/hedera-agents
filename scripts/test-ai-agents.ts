import { A2AClientHelper } from "../src/a2a/client-helper.js";
import { config } from "../src/config/index.js";
import axios from "axios";

async function testAIAgents() {
  console.log("🤖 Testing AI Agent Decision Logic (No On-Chain Execution)\n");
  console.log("=".repeat(70));

  try {
    // Fetch real market data for context
    console.log("\n📡 Fetching Real Market Data...");
    console.log("-".repeat(70));
    
    const feedId = config.pyth.hbarPriceFeedId.slice(2);
    const pythUrl = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${feedId}&encoding=hex`;
    
    let currentPrice = 0.13;
    let priceConfidence = 0.01;
    
    try {
      const { data } = await axios.get(pythUrl);
      if (data?.parsed?.[0]) {
        currentPrice = Number(data.parsed[0].price.price) / 1e8;
        priceConfidence = Number(data.parsed[0].price.conf) / 1e8;
        console.log(`✅ HBAR Price: $${currentPrice.toFixed(6)}`);
        console.log(`   Confidence: ±$${priceConfidence.toFixed(6)}`);
        console.log(`   Timestamp: ${new Date(data.parsed[0].metadata.proof_available_time * 1000).toISOString()}`);
      }
    } catch (error: any) {
      console.log(`⚠️  Failed to fetch Pyth data: ${error.message}`);
      console.log(`   Using fallback price: $${currentPrice}`);
    }

    // Test 1: Volatility Advisor with detailed output
    console.log("\n📊 TEST 1: Volatility Advisor Agent (Market Analysis)");
    console.log("-".repeat(70));
    console.log("Testing market data fetching and volatility calculation...\n");

    const advisorUrl = `http://localhost:${config.agents.volatilityAdvisor.port}/.well-known/agent-card.json`;
    
    const startTime = Date.now();
    const volatilityRec = await A2AClientHelper.sendMessage(
      advisorUrl,
      "recommend_volatility",
      { requestId: `test-${Date.now()}` }
    );
    const duration = Date.now() - startTime;

    console.log(`⏱️  Response time: ${duration}ms`);
    console.log(`\n📈 Volatility Recommendation:`);
    console.log(`   Volatility BPS: ${volatilityRec.volatilityBps} (${(volatilityRec.volatilityBps / 100).toFixed(2)}%)`);
    console.log(`   Confidence: ${(volatilityRec.confidence * 100).toFixed(1)}%`);
    console.log(`   Reasoning: ${volatilityRec.reasoning}`);

    // Check if it's fallback
    const isFallback = volatilityRec.reasoning?.toLowerCase().includes('fallback');
    if (isFallback) {
      console.log(`\n⚠️  WARNING: Agent used FALLBACK logic`);
      console.log(`   This means either:`);
      console.log(`   1. Failed to fetch historical prices from Pyth`);
      console.log(`   2. AI model failed to generate recommendation`);
      console.log(`   3. Network/API error occurred`);
    } else {
      console.log(`\n✅ SUCCESS: Agent used REAL MARKET DATA`);
    }

    console.log(`\n📋 Full Response:`);
    console.log(JSON.stringify(volatilityRec, null, 2));

    // Wait before next test
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Allocation Strategist with detailed output
    console.log("\n\n🎯 TEST 2: Allocation Strategist Agent (Portfolio Optimization)");
    console.log("-".repeat(70));
    console.log("Testing market trend analysis and allocation optimization...\n");

    const strategistUrl = `http://localhost:${config.agents.allocationStrategist.port}/.well-known/agent-card.json`;
    
    const allocStartTime = Date.now();
    const allocationRec = await A2AClientHelper.sendMessage(
      strategistUrl,
      "recommend_allocation",
      { 
        volatility: volatilityRec.volatilityBps,
        currentPrice: currentPrice,
        requestId: `test-${Date.now()}`
      }
    );
    const allocDuration = Date.now() - allocStartTime;

    console.log(`⏱️  Response time: ${allocDuration}ms`);
    console.log(`\n💰 Allocation Recommendation:`);
    console.log(`   HBAR: ${allocationRec.hbarAllocation / 100}% (${allocationRec.hbarAllocation} bps)`);
    console.log(`   USDC: ${allocationRec.usdcAllocation / 100}% (${allocationRec.usdcAllocation} bps)`);
    console.log(`   Confidence: ${(allocationRec.confidence * 100).toFixed(1)}%`);
    console.log(`   Reasoning: ${allocationRec.reasoning}`);

    // Check if it's fallback
    const isAllocFallback = allocationRec.reasoning?.toLowerCase().includes('fallback');
    if (isAllocFallback) {
      console.log(`\n⚠️  WARNING: Agent used FALLBACK logic`);
      console.log(`   This means either:`);
      console.log(`   1. Failed to fetch market trends`);
      console.log(`   2. AI model failed to generate allocation`);
      console.log(`   3. Network/API error occurred`);
    } else {
      console.log(`\n✅ SUCCESS: Agent used REAL MARKET ANALYSIS`);
    }

    console.log(`\n📋 Full Response:`);
    console.log(JSON.stringify(allocationRec, null, 2));

    // Test 3: Combined Analysis
    console.log("\n\n📊 TEST 3: Combined Strategy Analysis");
    console.log("-".repeat(70));
    
    const volatilityLevel = volatilityRec.volatilityBps > 100 ? 'HIGH' : 
                           volatilityRec.volatilityBps > 50 ? 'MEDIUM' : 'LOW';
    
    const riskProfile = allocationRec.hbarAllocation > 6000 ? 'AGGRESSIVE' :
                       allocationRec.hbarAllocation > 4000 ? 'BALANCED' : 'CONSERVATIVE';

    console.log(`\n🎲 Market Assessment:`);
    console.log(`   Current Price: $${currentPrice.toFixed(6)}`);
    console.log(`   Volatility Level: ${volatilityLevel} (${volatilityRec.volatilityBps} bps)`);
    console.log(`   Recommended Strategy: ${riskProfile}`);
    console.log(`   HBAR Exposure: ${allocationRec.hbarAllocation / 100}%`);
    console.log(`   Stable Reserve: ${allocationRec.usdcAllocation / 100}%`);

    console.log(`\n💡 Strategy Interpretation:`);
    if (volatilityLevel === 'HIGH' && riskProfile === 'CONSERVATIVE') {
      console.log(`   ✅ COHERENT: High volatility → Conservative allocation (protect capital)`);
    } else if (volatilityLevel === 'LOW' && riskProfile === 'AGGRESSIVE') {
      console.log(`   ✅ COHERENT: Low volatility → Aggressive allocation (capture upside)`);
    } else if (volatilityLevel === 'MEDIUM' && riskProfile === 'BALANCED') {
      console.log(`   ✅ COHERENT: Medium volatility → Balanced allocation (risk-managed)`);
    } else {
      console.log(`   ⚠️  REVIEW: Strategy may need calibration`);
    }

    // Summary
    console.log("\n\n" + "=".repeat(70));
    console.log("📈 TEST SUMMARY");
    console.log("=".repeat(70));
    
    const usingRealData = !isFallback && !isAllocFallback;
    
    if (usingRealData) {
      console.log(`✅ AGENTS USING REAL MARKET DATA & AI ANALYSIS`);
      console.log(`   • Volatility Agent: Real historical price analysis`);
      console.log(`   • Allocation Agent: Real market trend analysis`);
      console.log(`   • Decision Quality: HIGH`);
    } else {
      console.log(`⚠️  AGENTS USING FALLBACK LOGIC`);
      if (isFallback) {
        console.log(`   • Volatility Agent: Fallback (check logs for errors)`);
      }
      if (isAllocFallback) {
        console.log(`   • Allocation Agent: Fallback (check logs for errors)`);
      }
      console.log(`   • Decision Quality: BASIC (rule-based)`);
      console.log(`\n🔧 Troubleshooting:`);
      console.log(`   1. Check agent console logs for error details`);
      console.log(`   2. Verify Gemini API key is valid`);
      console.log(`   3. Check network connectivity to Pyth Hermes`);
      console.log(`   4. Ensure agents have sufficient startup time`);
    }

    console.log("\n" + "=".repeat(70));

  } catch (error: any) {
    console.error("\n❌ TEST FAILED:", error.message);
    console.error("\nFull error:");
    console.error(error);
    process.exit(1);
  }
}

// Run tests with startup delay
console.log("⏳ Waiting 7 seconds for agents to fully start and initialize...\n");
setTimeout(async () => {
  await testAIAgents();
  console.log("\n👋 AI Agent tests completed. Press Ctrl+C to exit.\n");
}, 7000);
