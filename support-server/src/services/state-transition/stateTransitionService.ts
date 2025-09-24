import { CairoCustomEnum, Contract, RpcProvider } from "starknet";
import { ABI as OptionRoundAbi } from "../../abi/optionRound";
import { ABI as vaultAbi } from "../../abi/vault";
import { Logger } from "winston";
import { Account } from "starknet";
import { JobRequest, JobStatus, OptionRoundState } from "../../types/types";
import { StateHandlers } from "./stateHandlers";
import { DB } from "../../shared/db";
import { getJobStatus } from "./utils";
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

  async refreshJobStatuses() {
    // Get all job requests from DB
    const jobRequests = await this.db.getJobRequestsPitchlake();
    this.logger.debug(`Found ${jobRequests.length} existing job requests`);

    // Update statuses in parallel with error handling
    const jobRequestsUpdated = await Promise.all(
      jobRequests.map(async (jobRequest) => {
        try {
          const updatedData: JobRequest = { ...jobRequest };

          // Only check status for non-failed jobs
          if (jobRequest.status !== JobStatus.Failed) {
            // Fetch latest status from fossil
            const jobStatus = await getJobStatus(jobRequest.job_id);

            // If status has changed, update DB
            if (jobStatus.status !== jobRequest.status) {
              this.logger.info(
                `Job ${jobRequest.job_id} status changed from ${jobRequest.status} to ${jobStatus.status}`,
              );

              await this.db.updateJobRequest(
                jobRequest.vaultAddress,
                jobRequest.job_id,
                jobStatus.status as JobStatus,
              );
              updatedData.status = jobStatus.status as JobStatus;

              // Clean up completed jobs immediately after status update
              if (jobStatus.status === JobStatus.Completed) {
                this.logger.info(
                  `Cleaning up completed job ${jobRequest.job_id} for vault ${jobRequest.vaultAddress}`,
                );
                await this.db.deleteJobRequest(jobRequest.vaultAddress);
                return null; // Mark for removal from the list
              }
            }
          }

          return updatedData;
        } catch (error) {
          this.logger.error(
            `Error updating job request ${jobRequest.job_id}:`,
            error,
          );
          return jobRequest; // Return original if update fails
        }
      }),
    );

    // Filter out null entries (completed jobs that were cleaned up)
    const activeJobRequests = jobRequestsUpdated.filter(
      (jobRequest) => jobRequest !== null,
    ) as JobRequest[];

    return activeJobRequests;
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

      const jobRequestsUpdated = await this.refreshJobStatuses();

      // Filter out null entries (completed jobs that were cleaned up)
      const activeJobRequests = jobRequestsUpdated.filter(
        (jobRequest) => jobRequest !== null,
      ) as JobRequest[];

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
          const jobRequest = activeJobRequests.find(
            (jobRequest) => jobRequest.vaultAddress === vaultAddress,
          );

          this.logger.debug(
            `Processing vault ${vaultAddress} with job request: ${
              jobRequest
                ? `${jobRequest.job_id} (${jobRequest.status})`
                : "none"
            }`,
          );

          const vaultContract = new Contract(
            vaultAbi,
            vaultAddress,
            this.account,
          ).typedv2(vaultAbi);

          await this.checkAndTransition(vaultContract, jobRequest);
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

  async checkAndTransition(
    vaultContract: Contract,
    jobRequest: JobRequest | undefined,
  ): Promise<void> {
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

      // Handle each state with proper error handling
      switch (stateEnum) {
        case OptionRoundState.Open:
          await this.stateHandlers.handleOpenState(
            roundContract,
            vaultContract,
            jobRequest,
          );
          break;

        case OptionRoundState.Auctioning:
          await this.stateHandlers.handleAuctioningState(
            roundContract,
            vaultContract,
            jobRequest,
          );
          break;

        case OptionRoundState.Running:
          await this.stateHandlers.handleRunningState(
            roundContract,
            vaultContract,
            jobRequest,
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
