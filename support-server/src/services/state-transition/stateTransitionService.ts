import { CairoCustomEnum, Contract, RpcProvider } from "starknet";
import { ABI as OptionRoundAbi } from "../../abi/optionRound";
import { ABI as vaultAbi } from "../../abi/vault";
import { Logger } from "winston";
import { Account } from "starknet";
import { OptionRoundState } from "../../types/types";
import { StateHandlers } from "./stateHandlers";
import { DB } from "../../shared/db";
import { ABI as erc20ABI } from "../../abi/erc20";

const { VAULT_ADDRESSES, STARKNET_PRIVATE_KEY, STARKNET_ACCOUNT_ADDRESS } =
  process.env;

export class StateTransitionService {
  private db: DB;
  private logger: Logger;
  private provider: RpcProvider;
  private account: Account;
  private stateHandlers: StateHandlers;

  constructor(logger: Logger, provider: RpcProvider) {
    this.logger = logger;
    this.provider = provider;
    this.account = new Account(
      provider,
      STARKNET_ACCOUNT_ADDRESS!,
      STARKNET_PRIVATE_KEY!,
    );
    this.db = new DB();
    this.stateHandlers = new StateHandlers(
      this.db,
      logger,
      provider,
      this.account,
    );
  }

  mineBlockHelper = async (vaultContract: Contract) => {
    // Only mine blocks on devnet
    if (process.env.IS_DEVNET !== "true") {
      return;
    }

    try {
      this.logger.info("mining block...");
      this.logger.debug("Mining block on devnet to update timestamp...");
      const ethAddress = await vaultContract.get_eth_address();
      const ethAddressHex = "0x" + BigInt(ethAddress).toString(16);
      const ethContract = new Contract(erc20ABI, ethAddressHex, this.account);
      const data = await ethContract.transfer(this.account.address, 123n);
      this.logger.debug(
        `Devnet block mining transaction: ${data.transaction_hash}`,
      );
      await this.provider.waitForTransaction(data.transaction_hash);
      this.logger.debug("Block mined successfully on devnet");
    } catch (error) {
      this.logger.error("Failed to mine block on devnet:", error);
      // Don't throw - this is just for devnet testing
    }
  };

  async markLatestPendingJobAsCompleted(vaultAddress: string, roundId: number) {
    // Mark the latest pending job for a specific round as completed
    // This handles the case where Fossil doesn't mark jobs as completed
    // but we know the round has advanced
    try {
      const count = await this.db.markLatestPendingJobAsCompleted(
        vaultAddress,
        roundId,
      );

      if (count > 0) {
        this.logger.info(
          `Marked latest pending job for vault ${vaultAddress} round ${roundId} as completed`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error marking latest pending job as completed for vault ${vaultAddress} round ${roundId}:`,
        error,
      );
    }
  }

  async runStateTransition() {
    if (!VAULT_ADDRESSES) {
      this.logger.warn("No vault addresses configured");
      return;
    }

    const vaultAddresses = VAULT_ADDRESSES.split(",").map((addr) =>
      addr.trim(),
    );
    this.logger.info(`Processing ${vaultAddresses.length} vaults`);

    try {
      const latestBlock = await this.provider.getBlock("latest");
      if (!latestBlock) {
        this.logger.error("No latest block found");
        return;
      }
      this.logger.debug(`Latest block: ${latestBlock.block_number}`);

      // Mine a block on devnet to update timestamps
      if (vaultAddresses.length > 0) {
        const vaultContract = new Contract(
          vaultAbi,
          vaultAddresses[0],
          this.account,
        ).typedv2(vaultAbi);
        await this.mineBlockHelper(vaultContract);
      }

      // Process each vault with proper error handling
      for (const vaultAddress of vaultAddresses) {
        try {
          const vaultContract = new Contract(
            vaultAbi,
            vaultAddress,
            this.account,
          ).typedv2(vaultAbi);

          await this.checkAndTransition(vaultContract);
        } catch (error) {
          this.logger.error(`Error processing vault ${vaultAddress}:`, error);
          // Continue with next vault instead of stopping the entire process
        }
      }
    } catch (error) {
      this.logger.error("Error in runStateTransition:", error);
      // Don't throw - let the scheduler retry on next run
    }
  }

  async checkAndTransition(vaultContract: Contract): Promise<void> {
    try {
      const roundId = await vaultContract.get_current_round_id();
      const roundAddress = await vaultContract.get_round_address(roundId);
      // Convert decimal address to hex
      const roundAddressHex = "0x" + BigInt(roundAddress).toString(16);
      this.logger.info(`Checking round ${roundId} at ${roundAddressHex}`);

      // First check if the contract exists
      try {
        const classHash = await this.provider.getClassHashAt(
          roundAddressHex as `0x${string}`,
          "latest",
        );
        this.logger.debug(`Contract class hash: ${classHash}`);

        if (!classHash || classHash === "0x0") {
          this.logger.warn(
            `Round contract at ${roundAddressHex} does not exist yet`,
          );
          return;
        }
      } catch (error) {
        this.logger.error(
          `Error checking if contract exists at ${roundAddressHex}:`,
          error,
        );
        return;
      }

      const roundContract = new Contract(
        OptionRoundAbi,
        roundAddressHex as `0x${string}`,
        this.provider,
      ).typedv2(OptionRoundAbi);

      const stateRaw = await roundContract.get_state();
      this.logger.debug(`Raw state: ${JSON.stringify(stateRaw)}`);
      const state = (stateRaw as CairoCustomEnum).activeVariant();

      // Map string state names to enum values
      const stateEnum = (() => {
        switch (state) {
          case "Open":
            return OptionRoundState.Open;
          case "Auctioning":
            return OptionRoundState.Auctioning;
          case "Running":
            return OptionRoundState.Running;
          case "Settled":
            return OptionRoundState.Settled;
          default:
            this.logger.warn(`Unknown state: ${state}`);
            return OptionRoundState.Open; // Default fallback
        }
      })();

      this.logger.info(`Round ${roundId} is in ${state} state (${stateEnum})`);

      // Mark latest pending job for previous round as completed (Fossil doesn't mark them as completed)
      if (Number(roundId) > 0) {
        await this.markLatestPendingJobAsCompleted(
          vaultContract.address,
          Number(roundId) - 1,
        );
      }

      // Handle each state with proper error handling
      // Each state handler will manage its own job requests
      console.log("MOCK MODE")
      switch (stateEnum) {
        case OptionRoundState.Open:
          await this.stateHandlers.handleOpenState(
            roundContract,
            vaultContract,
            Number(roundId),
          );
          break;

        case OptionRoundState.Auctioning:
          await this.stateHandlers.handleAuctioningState(
            roundContract,
            vaultContract,
            Number(roundId),
          );
          break;

        case OptionRoundState.Running:
          await this.stateHandlers.handleRunningState(
            roundContract,
            vaultContract,
            Number(roundId),
          );
          break;

        case OptionRoundState.Settled:
          this.logger.info("Round is settled - no actions possible");
          break;

        default:
          this.logger.warn(`Unknown state: ${stateEnum}`);
          break;
      }
    } catch (error) {
      this.logger.error(
        `Error in checkAndTransition for vault ${vaultContract.address}:`,
        error,
      );
      // Don't throw - let the service continue with other vaults
    }
  }
}
