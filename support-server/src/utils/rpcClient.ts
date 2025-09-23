import {StarknetBlock} from "../types/types";
import { Block } from "starknet"; 
import { createPublicClient, http, PublicClient } from "viem";
import { mainnet } from "viem/chains";


export class RPCClient {
  private client: PublicClient;

  constructor(config:any) {
    this.client = createPublicClient({
      chain: mainnet,
      transport: http(config.mainnetRpcUrl),
    });
  }

  getClient(): PublicClient {
    return this.client;
  }

  async getBlockNumber(): Promise<bigint> {
    return this.client.getBlockNumber();
  }

  async getBlock(blockNumber: bigint) {
    return this.client.getBlock({ blockNumber });
  }

  async getBlocks(fromBlock: number, length: number) {
    const blocks = [];
    
    // Process blocks sequentially with rate limiting to avoid hitting Alchemy limits
    for (let i = 0; i < length; i++) {
      try {
        const block = await this.client.getBlock({
          blockNumber: BigInt(fromBlock + i),
        });
        blocks.push(block);
        
        // Add small delay between requests to respect rate limits
        if (i < length - 1) { // Don't delay after the last request
          await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay
        }
      } catch (error) {
        console.error(`Error fetching block ${fromBlock + i}:`, error);
        
        // If it's a rate limit error, wait longer before continuing
        if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
          console.warn("Rate limited, waiting 2 seconds before continuing...");
          await new Promise(resolve => setTimeout(resolve, 2000));
          i--; // Retry the same block
          continue;
        }
        
        // For other errors, skip this block and continue
        console.warn(`Skipping block ${fromBlock + i} due to error`);
      }
    }
    
    blocks.sort((a, b) => Number(a.number) - Number(b.number));
    return blocks;
  }
} 


export const rpcToStarknetBlock = (block: Block): StarknetBlock => {
  return {
    blockNumber: Number(block.block_number),
    timestamp: Number(block.timestamp),

  };
};