import { Account, Contract, RpcProvider, CairoCustomEnum } from "starknet";
import { Logger } from "winston";
import { formatRawFossilRequest, formatTimeLeft, getJobStatus } from "./utils";
import { sendFossilRequest } from "./utils";
import { JobRequest, JobStatus } from "../../types/types";
import { rpcToStarknetBlock } from "../../utils/rpcClient";
import { DB } from "../../shared/db";

export class StateHandlers {
  private db: DB;
  private logger: Logger;
  private provider: RpcProvider;
  private account: Account;

  constructor(db: DB, logger: Logger, provider: RpcProvider, account: Account) {
    this.db = db;
    this.logger = logger;
    this.provider = provider;
    this.account = account;
  }

  private async refreshJobStatus(jobRequest: JobRequest): Promise<JobRequest> {
    try {
      if (jobRequest.status === JobStatus.Failed) {
        return jobRequest; // Don't refresh failed jobs
      }

      const jobStatus = await getJobStatus(jobRequest.job_id);
      
      if (jobStatus.status !== jobRequest.status) {
        this.logger.info(
          `Job ${jobRequest.job_id} status changed from ${jobRequest.status} to ${jobStatus.status}`,
        );

        await this.db.updateJobRequestStatus(
          jobRequest.job_id,
          jobStatus.status as JobStatus,
        );

        return {
          ...jobRequest,
          status: jobStatus.status as JobStatus,
        };
      }

      return jobRequest;
    } catch (error) {
      this.logger.error(
        `Error refreshing job status for ${jobRequest.job_id}:`,
        error,
      );
      return jobRequest;
    }
  }

  async handleOpenState(
    roundContract: Contract,
    vaultContract: Contract,
    roundId: number,
  ) {
    try {
      // Check if this is the first round that needs initialization
      const reservePrice = await roundContract.get_reserve_price();
      this.logger.debug(`Reserve price: ${reservePrice}`);

      if (reservePrice === 0n) {
        this.logger.info("First round detected - needs initialization");

        // Check for latest job request for round 0 (initialization)
        const jobRequest = await this.db.getLatestJobRequestByVaultAndRound(vaultContract.address, 0);

        if (jobRequest) {
          // Refresh job status from Fossil
          const refreshedJobRequest = await this.refreshJobStatus(jobRequest);

          if (refreshedJobRequest.status === JobStatus.Pending) {
            this.logger.info(
              `Job request for vault ${vaultContract.address} round 0 is pending`,
            );
            return;
          }

          if (refreshedJobRequest.status === JobStatus.Completed) {
            this.logger.info(
              `Job request for vault ${vaultContract.address} round 0 is completed, proceeding with auction start`,
            );
            // Double-check that reserve price is now set (safety check)
            const updatedReservePrice = await roundContract.get_reserve_price();
            if (updatedReservePrice === 0n) {
              this.logger.warn(
                `Job completed but reserve price still 0 for vault ${vaultContract.address}. This may be a timing issue.`,
              );
              // Continue anyway - the next poll will handle it
            }
          } else if (refreshedJobRequest.status === JobStatus.Failed) {
            this.logger.info(
              `Latest job request for vault ${vaultContract.address} round 0 failed, will send new request`,
            );
          }
        }

        // If no job request or latest was failed, send new request
        if (!jobRequest || jobRequest.status === JobStatus.Failed) {
          // Check if we're past the proving delay for initialization
          const deploymentTime = Number(
            await roundContract.get_deployment_date(),
          );
          const provingDelay = Number(await vaultContract.get_proving_delay());
          const latestBlock = await this.provider.getBlock("latest");
          if (!latestBlock) {
            this.logger.error("No latest block found");
            return;
          }
          const latestStarknetBlock = rpcToStarknetBlock(latestBlock);

          const earliestInitTime = deploymentTime + provingDelay;
          if (latestStarknetBlock.timestamp < earliestInitTime) {
            this.logger.info(
              `Waiting for proving delay to pass. Earliest init time: ${earliestInitTime}, current: ${latestStarknetBlock.timestamp}, time left: ${formatTimeLeft(
                latestStarknetBlock.timestamp,
                earliestInitTime,
              )}`,
            );
            return;
          }

          this.logger.info(
            `Sending new job request for vault ${vaultContract.address} round 0`,
          );

          const requestData =
            await vaultContract.get_request_to_start_first_round();
          const response = await sendFossilRequest(
            formatRawFossilRequest(requestData),
            vaultContract,
            this.logger,
          );

          await this.db.insertJobRequest(
            vaultContract.address,
            response.job_id,
            response.status as JobStatus,
            0, // Round 0 for initialization
          );
          return; // Exit here to let the cron handle the state transition in the next iteration
        }
      } else {
        this.logger.info("Reserve price is set - not a first round initialization");
      }

      // Auction start logic with proper time validation
      const auctionStartTime = Number(
        await roundContract.get_auction_start_date(),
      );
      this.logger.debug(`Auction start time: ${auctionStartTime}`);

      const latestBlock = await this.provider.getBlock("latest");
      if (!latestBlock) {
        this.logger.error("No latest block found");
        return;
      }

      const latestStarknetBlock = rpcToStarknetBlock(latestBlock);
      this.logger.debug(`Current timestamp: ${latestStarknetBlock.timestamp}`);

      // Check if it's time to start the auction
      if (latestStarknetBlock.timestamp < auctionStartTime) {
        this.logger.info(
          `Waiting for auction start time. Time left: ${formatTimeLeft(
            latestStarknetBlock.timestamp,
            auctionStartTime,
          )}`,
        );
        return;
      }

      this.logger.info("Starting auction...");

      // Estimate gas fee with error handling
      let estimatedMaxFee;
      try {
        const feeEstimate = await this.account.estimateInvokeFee({
          contractAddress: vaultContract.address,
          entrypoint: "start_auction",
          calldata: [],
        });
        estimatedMaxFee = feeEstimate.suggestedMaxFee;
        this.logger.debug(`Estimated max fee: ${estimatedMaxFee}`);
      } catch (error) {
        this.logger.error(
          "Failed to estimate gas fee for start_auction:",
          error,
        );
        return;
      }

      // Execute transaction with proper error handling
      try {
        const { transaction_hash } = await vaultContract.start_auction();
        this.logger.info(
          `Auction start transaction submitted: ${transaction_hash}`,
        );

        // Wait for transaction confirmation with timeout
        const receipt = await this.provider.waitForTransaction(
          transaction_hash,
          {
            retryInterval: 2000,
            successStates: ["ACCEPTED_ON_L2", "ACCEPTED_ON_L1"],
          },
        );

        this.logger.info("Auction started successfully", {
          transactionHash: transaction_hash,
          receipt: JSON.stringify(receipt),
        });
      } catch (error) {
        this.logger.error("Failed to start auction:", error);
        // Don't throw - let the service continue with other vaults
        return;
      }
    } catch (error) {
      this.logger.error("Error handling Open state:", error);
      // Don't throw - let the service continue with other vaults
    }
  }

  async handleAuctioningState(
    roundContract: Contract,
    vaultContract: Contract,
    roundId: number,
  ) {
    try {

      const auctionEndTimeRaw = await roundContract.get_auction_end_date();
      const auctionEndTime = Number(auctionEndTimeRaw);
      this.logger.debug(`Auction end time: ${auctionEndTime}`);

      const latestBlock = await this.provider.getBlock("latest");
      if (!latestBlock) {
        this.logger.error("No latest block found");
        return;
      }

      const latestStarknetBlock = rpcToStarknetBlock(latestBlock);
      this.logger.debug(`Current timestamp: ${latestStarknetBlock.timestamp}`);

      if (latestStarknetBlock.timestamp < auctionEndTime) {
        this.logger.info(
          `Waiting for auction end time. Time left: ${formatTimeLeft(
            latestStarknetBlock.timestamp,
            auctionEndTime,
          )}`,
        );
        return;
      }

      this.logger.info("Ending auction...");

      // Estimate gas fee with error handling
      let estimatedMaxFee;
      try {
        const feeEstimate = await this.account.estimateInvokeFee({
          contractAddress: vaultContract.address,
          entrypoint: "end_auction",
          calldata: [],
        });
        estimatedMaxFee = feeEstimate.suggestedMaxFee;
        this.logger.debug(`Estimated max fee: ${estimatedMaxFee}`);
      } catch (error) {
        this.logger.error("Failed to estimate gas fee for end_auction:", error);
        return;
      }

      // Execute transaction with proper error handling
      try {
        const { transaction_hash } = await vaultContract.end_auction();
        this.logger.info(
          `Auction end transaction submitted: ${transaction_hash}`,
        );

        // Wait for transaction confirmation with timeout
        const receipt = await this.provider.waitForTransaction(
          transaction_hash,
          {
            retryInterval: 2000,
            successStates: ["ACCEPTED_ON_L2", "ACCEPTED_ON_L1"],
          },
        );

        this.logger.info("Auction ended successfully", {
          transactionHash: transaction_hash,
          receipt: JSON.stringify(receipt),
        });
      } catch (error) {
        this.logger.error("Failed to end auction:", error);
        // Don't throw - let the service continue with other vaults
        return;
      }
    } catch (error) {
      this.logger.error("Error handling Auctioning state:", error);
      // Don't throw - let the service continue with other vaults
    }
  }

  async handleRunningState(
    roundContract: Contract,
    vaultContract: Contract,
    roundId: number,
  ): Promise<void> {
    try {
      const settlementTime = Number(
        await roundContract.get_option_settlement_date(),
      );
      this.logger.debug(`Settlement time: ${settlementTime}`);

      const latestBlock = await this.provider.getBlock("latest");
      if (!latestBlock) {
        this.logger.error("No latest block found");
        return;
      }

      const latestStarknetBlock = rpcToStarknetBlock(latestBlock);
      this.logger.debug(`Current timestamp: ${latestStarknetBlock.timestamp}`);

      if (latestStarknetBlock.timestamp < settlementTime) {
        this.logger.info(
          `Waiting for settlement time. Time left: ${formatTimeLeft(
            latestStarknetBlock.timestamp,
            settlementTime,
          )}`,
        );
        return;
      }

      this.logger.info("Settlement time reached");

      // Check if we already have a pending job for settlement
      if (jobRequest?.status === JobStatus.Pending) {
        this.logger.info(
          `Settlement job request for vault ${vaultContract.address} is pending`,
        );
        return;
      }

      // Handle failed jobs - retry by sending new request
      if (jobRequest?.status === JobStatus.Failed) {
        this.logger.info(
          `Settlement job request for vault ${vaultContract.address} failed, retrying`,
        );
        // Clean up failed job before sending new one
        await this.db.deleteJobRequest(vaultContract.address);
      }

      // Check if we're past the proving delay for settlement
      const provingDelay = Number(await vaultContract.get_proving_delay());
      const earliestSettlementTime = settlementTime + provingDelay;

      if (latestStarknetBlock.timestamp < earliestSettlementTime) {
        this.logger.info(
          `Waiting for proving delay to pass for settlement. Earliest settlement time: ${earliestSettlementTime}, current: ${latestStarknetBlock.timestamp}, time left: ${formatTimeLeft(
            latestStarknetBlock.timestamp,
            earliestSettlementTime,
          )}`,
        );
        return;
      }

      // Send settlement request with proper error handling
      try {
        const rawRequestData =
          await vaultContract.get_request_to_settle_round();
        const requestData = formatRawFossilRequest(rawRequestData);

        const response = await sendFossilRequest(
          requestData,
          vaultContract,
          this.logger,
        );

        // Store the settlement job request for tracking
        await this.db.upsertJobRequest(
          vaultContract.address,
          response.job_id,
          response.status as JobStatus,
        );

        this.logger.info("Settlement request sent successfully", {
          jobId: response.job_id,
          status: response.status,
        });
      } catch (error) {
        this.logger.error("Failed to send settlement request:", error);
        // Don't throw - let the service continue with other vaults
        return;
      }
    } catch (error) {
      this.logger.error("Error handling Running state:", error);
      // Don't throw - let the service continue with other vaults
    }
  }
}
