import { GoogleGenerativeAI } from "@google/generative-ai";
import { RequestContext } from "@a2a-js/sdk/server";
import { BaseAgentExecutor } from "../a2a/server-factory.js";
import { config } from "../config/index.js";
import { VolatilityRecommendation } from "../types/index.js";
import axios from "axios";

export class VolatilityAdvisorExecutor extends BaseAgentExecutor {
  private gemini: GoogleGenerativeAI;
  private model: any;
  private historicalData: Array<{ timestamp: Date; volatility: number; price: number }> = [];

  constructor() {
    super();
    this.gemini = new GoogleGenerativeAI(config.gemini.apiKey);
    // Use gemini-2.5-flash-lite instead of experimental model
    this.model = this.gemini.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
  }

  async processRequest(context: RequestContext): Promise<VolatilityRecommendation> {
    console.log("📊 Volatility Advisor: Analyzing market conditions...");

    try {
      // Step 1: Fetch real market data from multiple sources
      const marketData = await this.fetchComprehensiveMarketData();
      
      // Step 2: Calculate technical indicators
      const technicalAnalysis = this.calculateTechnicalIndicators(marketData);
      
      // Step 3: Feed data to AI for intelligent decision
      const recommendation = await this.getAIRecommendation(marketData, technicalAnalysis);

      console.log(`💡 AI Recommended Volatility: ${recommendation.volatilityBps} bps (${(recommendation.confidence * 100).toFixed(0)}% confidence)`);
      console.log(`   Realized Vol: ${technicalAnalysis.realizedVol.toFixed(2)}%`);
      console.log(`   Reasoning: ${recommendation.reasoning}`);

      this.historicalData.push({
        timestamp: new Date(),
        volatility: recommendation.volatilityBps,
        price: marketData.currentPrice,
      });

      return recommendation;
    } catch (error) {
      console.error("Error in AI volatility analysis:", error);
      return this.getFallbackRecommendation();
    }
  }

  private async fetchComprehensiveMarketData(): Promise<any> {
    const results: any = {
      currentPrice: 0,
      priceHistory: [],
      volume24h: 0,
      marketCap: 0,
      priceChange24h: 0,
      bitcoinPrice: 0,
      ethereumPrice: 0,
      cryptoMarketSentiment: "neutral",
    };

    try {
      // 1. Fetch HBAR price from Pyth
      const feedId = config.pyth.hbarPriceFeedId.slice(2);
      const pythUrl = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${feedId}&encoding=hex`;
      
      const priceHistory = [];
      for (let i = 0; i < 10; i++) {
        try {
          const { data } = await axios.get(pythUrl);
          if (data?.parsed?.[0]) {
            const price = Number(data.parsed[0].price.price) / 1e8;
            priceHistory.push(price);
          }
          if (i < 9) await new Promise(resolve => setTimeout(resolve, 150));
        } catch (e) {
          // Skip
        }
      }

      results.currentPrice = priceHistory[0] || 0.128;
      results.priceHistory = priceHistory;

      // 2. Fetch Bitcoin & Ethereum prices (for market context)
      try {
        const btcUrl = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43&encoding=hex`;
        const ethUrl = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace&encoding=hex`;
        
        const [btcRes, ethRes] = await Promise.all([
          axios.get(btcUrl).catch(() => null),
          axios.get(ethUrl).catch(() => null),
        ]);

        if (btcRes?.data?.parsed?.[0]) {
          results.bitcoinPrice = Number(btcRes.data.parsed[0].price.price) / 1e8;
        }
        if (ethRes?.data?.parsed?.[0]) {
          results.ethereumPrice = Number(ethRes.data.parsed[0].price.price) / 1e8;
        }
      } catch (e) {
        console.log("⚠️  Unable to fetch BTC/ETH prices");
      }

      // 3. Fetch HBAR market data from CoinGecko (free tier)
      try {
        const cgUrl = "https://api.coingecko.com/api/v3/coins/hedera-hashgraph";
        const { data: cgData } = await axios.get(cgUrl, {
          timeout: 3000,
        });

        if (cgData?.market_data) {
          results.marketCap = cgData.market_data.market_cap?.usd || 0;
          results.volume24h = cgData.market_data.total_volume?.usd || 0;
          results.priceChange24h = cgData.market_data.price_change_percentage_24h || 0;
        }

        // Sentiment based on price change
        if (results.priceChange24h > 5) {
          results.cryptoMarketSentiment = "bullish";
        } else if (results.priceChange24h < -5) {
          results.cryptoMarketSentiment = "bearish";
        }
      } catch (e) {
        console.log("⚠️  CoinGecko API unavailable, using Pyth data only");
      }

      console.log(`📈 Market Data: $${results.currentPrice.toFixed(6)} | 24h: ${results.priceChange24h.toFixed(2)}% | Sentiment: ${results.cryptoMarketSentiment}`);
      
      return results;
    } catch (error) {
      console.error("Error fetching market data:", error);
      return results;
    }
  }

  private calculateTechnicalIndicators(marketData: any): any {
    const prices = marketData.priceHistory;
    
    if (prices.length < 2) {
      return {
        realizedVol: 5.0,
        priceRange: 0,
        avgPrice: marketData.currentPrice,
        trend: "sideways",
      };
    }

    // Calculate volatility
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      if (prices[i - 1] > 0) {
        returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
      }
    }

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const realizedVol = stdDev * Math.sqrt(365 * 24 * 60) * 100; // Annualized

    // Price range
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = ((maxPrice - minPrice) / minPrice) * 100;

    // Average price
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;

    // Trend detection
    const recentTrend = prices[0] > prices[prices.length - 1] ? "up" : 
                       prices[0] < prices[prices.length - 1] ? "down" : "sideways";

    return {
      realizedVol: Math.min(realizedVol, 100), // Cap at 100%
      priceRange,
      avgPrice,
      trend: recentTrend,
    };
  }

  private async getAIRecommendation(marketData: any, technical: any): Promise<VolatilityRecommendation> {
    const prompt = `You are a quantitative analyst for a DeFi portfolio rebalancing system. Analyze the provided market data and recommend an optimal volatility threshold.

**HBAR Market Data:**
- Current Price: $${marketData.currentPrice.toFixed(6)}
- 24h Change: ${marketData.priceChange24h.toFixed(2)}%
- Market Cap: $${(marketData.marketCap / 1e9).toFixed(2)}B
- 24h Volume: $${(marketData.volume24h / 1e6).toFixed(2)}M
- Market Sentiment: ${marketData.cryptoMarketSentiment}

**Technical Analysis:**
- Realized Volatility: ${technical.realizedVol.toFixed(2)}%
- Price Range (recent): ${technical.priceRange.toFixed(2)}%
- Price Trend: ${technical.trend}
- Average Price: $${technical.avgPrice.toFixed(6)}

**Crypto Market Context:**
- Bitcoin: $${marketData.bitcoinPrice > 0 ? marketData.bitcoinPrice.toLocaleString() : 'N/A'}
- Ethereum: $${marketData.ethereumPrice > 0 ? marketData.ethereumPrice.toLocaleString() : 'N/A'}

**Your Task:**
Recommend a volatility threshold (in basis points) for triggering portfolio rebalancing. This threshold determines when the system moves assets from HBAR to USDC for protection.

**Guidelines:**
- Higher volatility observed → Lower threshold (50-75 bps) for earlier protection
- Moderate volatility → Medium threshold (75-100 bps) for balanced approach  
- Lower volatility → Higher threshold (100-150 bps) to avoid overtrading
- Consider market sentiment and broader crypto trends
- Factor in recent price action and volume

Respond with ONLY this JSON (no markdown, no explanation outside JSON):
{
  "volatilityBps": <integer 30-200>,
  "confidence": <float 0.75-0.95>,
  "reasoning": "<1-2 sentences explaining your analysis and recommendation>"
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const recommendation: VolatilityRecommendation = JSON.parse(jsonMatch[0]);
        
        // Validate
        recommendation.volatilityBps = Math.max(30, Math.min(200, recommendation.volatilityBps));
        recommendation.confidence = Math.max(0.75, Math.min(0.95, recommendation.confidence));
        
        return recommendation;
      }
    } catch (error) {
      console.error("AI generation error:", error);
    }

    // Fallback based on technical data
    return this.getFallbackRecommendation(technical.realizedVol);
  }

  private getFallbackRecommendation(realizedVol?: number): VolatilityRecommendation {
    const vol = realizedVol || 5.0;
    
    let volatilityBps = vol > 10 ? 60 : vol > 5 ? 85 : 120;

    return {
      volatilityBps,
      confidence: 0.75,
      reasoning: `Fallback: Based on ${vol.toFixed(1)}% realized volatility. Network error prevented AI analysis.`,
    };
  }
}
