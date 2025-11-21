import { ethers } from "ethers";
import { config } from "../config/index.js";
import {
  VOLATILITY_INDEX_ABI,
  REBALANCE_EXECUTOR_ABI,
  USER_VAULT_ABI,
  ERC20_ABI,
  PYTH_ABI,
} from "./contract-interfaces.js";

export class HederaClient {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  public volatilityIndex: ethers.Contract;
  public rebalanceExecutor: ethers.Contract;
  public userVault: ethers.Contract;
  public usdc: ethers.Contract;
  public pythContract: ethers.Contract;

  constructor() {
    // Hedera testnet JSON-RPC endpoint
    const rpcUrl =
      config.hedera.network === "mainnet"
        ? "https://mainnet.hashio.io/api"
        : "https://maximum-wandering-choice.hedera-testnet.quiknode.pro/c345e10a4b1fd4aae0baf5b8ad7cec95e6bbd31b/";

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(config.hedera.privateKey, this.provider);

    // Initialize contract instances
    this.volatilityIndex = new ethers.Contract(
      config.contracts.volatilityIndex,
      VOLATILITY_INDEX_ABI,
      this.wallet
    );

    this.rebalanceExecutor = new ethers.Contract(
      config.contracts.rebalanceExecutor,
      REBALANCE_EXECUTOR_ABI,
      this.wallet
    );

    this.userVault = new ethers.Contract(
      config.contracts.userVault,
      USER_VAULT_ABI,
      this.wallet
    );

    this.usdc = new ethers.Contract(
      config.contracts.usdc,
      ERC20_ABI,
      this.wallet
    );

    this.pythContract = new ethers.Contract(
      config.contracts.pyth,
      PYTH_ABI,
      this.wallet
    );
  }

  async updateVolatility(
    priceUpdate: string,
    feedId: string,
    volatilityBps: number
  ): Promise<ethers.TransactionReceipt | null> {
    const priceUpdateArray = [priceUpdate];

    // Get Pyth's suggested fee
    const pythFee = await this.pythContract.getUpdateFee(priceUpdateArray);

    // Hedera requires minimum 1 tinybar = 10 gwei
    const MIN_HEDERA_FEE = ethers.parseUnits("10", "gwei"); // 1 tinybar minimum

    // Use the HIGHER of Pyth fee or Hedera minimum
    const fee = pythFee > MIN_HEDERA_FEE ? pythFee : MIN_HEDERA_FEE;

    console.log(`💰 Pyth fee requested: ${ethers.formatEther(pythFee)} HBAR`);
    console.log(
      `💰 Actual fee (with Hedera min): ${ethers.formatEther(fee)} HBAR`
    );

    const tx = await this.volatilityIndex.updateVolatility(
      priceUpdateArray,
      feedId,
      volatilityBps,
      {
        value: fee,
        gasLimit: 1000000,
      }
    );

    return await tx.wait();
  }

  async getVolatilityData(feedId: string) {
    return await this.volatilityIndex.getVolatilityData(feedId);
  }

  async needsRebalancing(
    vaultAddress: string,
    token1: string,
    token2: string,
    targetAlloc1: number,
    targetAlloc2: number,
    volatilityThreshold: number,
    priceFeedId: string
  ): Promise<{ needed: boolean; drift: bigint }> {
    const [needed, drift] = await this.rebalanceExecutor.needsRebalancing(
      vaultAddress,
      token1,
      token2,
      targetAlloc1,
      targetAlloc2,
      volatilityThreshold,
      priceFeedId
    );
    return { needed, drift };
  }

  async executeRebalance(
    vaultAddress: string,
    token1: string,
    token2: string,
    targetAlloc1: number,
    targetAlloc2: number,
    volatilityThreshold: number,
    priceFeedId: string
  ): Promise<ethers.TransactionReceipt | null> {
    const tx = await this.rebalanceExecutor.executeRebalance(
      vaultAddress,
      token1,
      token2,
      targetAlloc1,
      targetAlloc2,
      volatilityThreshold,
      priceFeedId,
      { gasLimit: 5000000 }
    );
    return await tx.wait();
  }

  async getVaultBalances(vaultAddress: string) {
    const hbarBalance = await this.userVault.getHBARBalance();
    const usdcBalance = await this.usdc.balanceOf(vaultAddress);
    return { hbarBalance, usdcBalance };
  }
}
