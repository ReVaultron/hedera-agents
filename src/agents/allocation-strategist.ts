import { GoogleGenerativeAI } from "@google/generative-ai";
import { RequestContext } from "@a2a-js/sdk/server";
import { BaseAgentExecutor } from "../a2a/server-factory.js";
import { config } from "../config/index.js";
import { AllocationRecommendation } from "../types/index.js";
import axios from "axios";

export class AllocationStrategistExecutor extends BaseAgentExecutor {
  private gemini: GoogleGenerativeAI;
  private model: any;

  constructor() {
    super();
    this.gemini = new GoogleGenerativeAI(config.gemini.apiKey);
    this.model = this.gemini.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
  }

  async processRequest(context: RequestContext): Promise<AllocationRecommendation> {
    const requestData = JSON.parse(context.userMessage.parts[0].text || "{}");

    console.log("🎯 Allocation Strategist: Calculating optimal allocation...");

    try {
      // Fetch comprehensive market data
      const marketData = await this.fetchMarketIntelligence();
      
      // Get AI-powered allocation decision
      const recommendation = await this.getAIAllocation(
        requestData.volatility || 100,
        marketData
      );

      console.log(`💰 AI Recommended: ${recommendation.hbarAllocation / 100}% HBAR / ${recommendation.usdcAllocation / 100}% USDC`);
      console.log(`   Confidence: ${(recommendation.confidence * 100).toFixed(0)}%`);

      return recommendation;
    } catch (error) {
      console.error("Error in AI allocation:", error);
      return this.getFallbackAllocation(requestData.volatility || 100);
    }
  }

  private async fetchMarketIntelligence(): Promise<any> {
    const intelligence: any = {
      hbarPrice: 0,
      hbarChange24h: 0,
      hbarVolume24h: 0,
      defiTvl: 0,
      hederaEcosystem: "",
      cryptoFearGreed: 50,
      btcDominance: 50,
    };

    try {
      // 1. HBAR data from CoinGecko
      const cgUrl = "https://api.coingecko.com/api/v3/coins/hedera-hashgraph";
      const { data } = await axios.get(cgUrl, { timeout: 3000 });

      if (data?.market_data) {
        intelligence.hbarPrice = data.market_data.current_price?.usd || 0.128;
        intelligence.hbarChange24h = data.market_data.price_change_percentage_24h || 0;
        intelligence.hbarVolume24h = data.market_data.total_volume?.usd || 0;
      }

      // 2. Crypto market overview
      try {
        const globalUrl = "https://api.coingecko.com/api/v3/global";
        const { data: globalData } = await axios.get(globalUrl, { timeout: 3000 });
        
        if (globalData?.data) {
          intelligence.defiTvl = globalData.data.total_market_cap?.usd || 0;
          intelligence.btcDominance = globalData.data.market_cap_percentage?.btc || 50;
        }
      } catch (e) {
        console.log("⚠️  Global market data unavailable");
      }

      // 3. Mock ecosystem data (in production, scrape from Hedera sites)
      intelligence.hederaEcosystem = `
- Recent partnerships announced with enterprise clients
- Growing DeFi ecosystem with increased TVL
- Network upgrades improving performance
- Stable governance and foundation support
      `.trim();

      // 4. Fear & Greed estimate based on price action
      if (intelligence.hbarChange24h > 5) {
        intelligence.cryptoFearGreed = 70; // Greed
      } else if (intelligence.hbarChange24h < -5) {
        intelligence.cryptoFearGreed = 30; // Fear
      }

      console.log(`📊 Market Intel: HBAR $${intelligence.hbarPrice.toFixed(6)} | 24h: ${intelligence.hbarChange24h.toFixed(2)}% | Sentiment: ${intelligence.cryptoFearGreed}/100`);

      return intelligence;
    } catch (error) {
      console.error("Error fetching market intelligence:", error);
      return intelligence;
    }
  }

  private async getAIAllocation(volatilityBps: number, marketData: any): Promise<AllocationRecommendation> {
    const prompt = `You are a DeFi portfolio manager optimizing HBAR/USDC allocation. Analyze the market data and recommend the optimal allocation percentages.

**Portfolio Parameters:**
- Volatility Threshold: ${volatilityBps} bps (${(volatilityBps / 100).toFixed(2)}%)
- This threshold triggers rebalancing when market volatility exceeds it

**HBAR Market Conditions:**
- Current Price: $${marketData.hbarPrice.toFixed(6)}
- 24h Change: ${marketData.hbarChange24h.toFixed(2)}%
- 24h Volume: $${(marketData.hbarVolume24h / 1e6).toFixed(2)}M
- Crypto Fear/Greed Index: ${marketData.cryptoFearGreed}/100

**Crypto Market Context:**
- BTC Dominance: ${marketData.btcDominance.toFixed(1)}%
- Total Crypto Market Cap: $${(marketData.defiTvl / 1e12).toFixed(2)}T

**Hedera Ecosystem:**
${marketData.hederaEcosystem}

**Your Task:**
Recommend optimal HBAR/USDC allocation percentages that:
1. Match the risk level indicated by the volatility threshold
2. Consider current market sentiment and trends
3. Balance growth potential with capital preservation
4. Account for Hedera ecosystem fundamentals

**Allocation Guidelines:**
- High volatility (>100 bps) OR bearish sentiment → Conservative (20-40% HBAR)
- Medium volatility (60-100 bps) AND neutral sentiment → Balanced (40-60% HBAR)
- Low volatility (<60 bps) AND bullish sentiment → Growth (60-80% HBAR)
- Always maintain at least 20% in each asset for liquidity

Respond with ONLY this JSON (no markdown):
{
  "hbarAllocation": <integer 2000-8000 (in bps, e.g., 5000 = 50%)>,
  "usdcAllocation": <integer must sum with hbarAllocation to 10000>,
  "confidence": <float 0.75-0.95>,
  "reasoning": "<1-2 sentences explaining allocation strategy based on data>"
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const recommendation: AllocationRecommendation = JSON.parse(jsonMatch[0]);
        
        // Validate and normalize
        recommendation.hbarAllocation = Math.max(2000, Math.min(8000, recommendation.hbarAllocation));
        recommendation.usdcAllocation = 10000 - recommendation.hbarAllocation;
        recommendation.confidence = Math.max(0.75, Math.min(0.95, recommendation.confidence));
        
        return recommendation;
      }
    } catch (error) {
      console.error("AI allocation error:", error);
    }

    return this.getFallbackAllocation(volatilityBps);
  }

  private getFallbackAllocation(volatilityBps: number): AllocationRecommendation {
    let hbarAllocation = volatilityBps > 100 ? 3000 : volatilityBps > 60 ? 5000 : 7000;
    
    return {
      hbarAllocation,
      usdcAllocation: 10000 - hbarAllocation,
      confidence: 0.80,
      reasoning: `Fallback: Rule-based allocation for ${volatilityBps} bps volatility. AI analysis unavailable.`,
    };
  }
}
