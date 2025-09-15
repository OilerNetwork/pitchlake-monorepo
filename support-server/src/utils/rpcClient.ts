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
    const promises = Array.from({ length }, async (_, i) => {
      const block = await this.client.getBlock({
        blockNumber: BigInt(fromBlock + i),
      });
      return block;
    });
    const blocks = await Promise.all(promises);
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