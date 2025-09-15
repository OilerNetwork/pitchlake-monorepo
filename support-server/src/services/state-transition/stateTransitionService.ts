import { FormattedBlockData } from "../confirmed-twaps/types";
import { CairoCustomEnum, Contract, RpcProvider } from "starknet";
import { ABI as OptionRoundAbi } from "../../abi/optionRound";
import { Logger } from "winston";
import { Account } from "starknet";
import {  OptionRoundState, StarknetBlock } from "../../types/types";
import { rpcToStarknetBlock } from "../../utils/rpcClient";
import { StateHandlers } from "./stateHandlers";

const {
  VAULT_ADDRESSES,
  STARKNET_RPC,
  STARKNET_PRIVATE_KEY,
  STARKNET_ACCOUNT_ADDRESS,
  FOSSIL_API_KEY,
  FOSSIL_API_URL,
} = process.env;

export class StateTransitionService {
  private latestBlockFossil: FormattedBlockData;
  private latestBlockStarknet: StarknetBlock;
  private logger: Logger;
  private provider: RpcProvider;
  private account: Account;
  private stateHandlers: StateHandlers;

  constructor(
    latestBlockFossil: FormattedBlockData,
    latestBlockStarknet: StarknetBlock,
    logger: Logger,
    provider: RpcProvider
  ) {
    this.latestBlockFossil = latestBlockFossil;
    this.latestBlockStarknet = latestBlockStarknet;
    this.logger = logger;
    this.provider = provider;
    this.account = new Account(
      provider,
      STARKNET_PRIVATE_KEY!,
      STARKNET_ACCOUNT_ADDRESS!
    );
    this.stateHandlers = new StateHandlers(
      logger,
      provider,
      this.account,
      latestBlockFossil,
      latestBlockStarknet
    );
  }

  async runStateTransition() {
    if (!VAULT_ADDRESSES) return;
    const vaultAddresses = VAULT_ADDRESSES.split(",").map((addr) =>
      addr.trim()
    );

    const latestBlock = await this.provider.getBlock("latest");
    if (!latestBlock) {
      this.logger.error("No latest block found");
      return;
    }
    const latestBlockFormatted = rpcToStarknetBlock(latestBlock);
    const vaultContracts = vaultAddresses.map((vaultAddress) => {
      const vaultContract = new Contract(OptionRoundAbi, vaultAddress, this.account);
      return vaultContract;
    });
    const transitions = await Promise.all(
      vaultContracts.map(async (vaultContract) => {
        return this.checkAndTransition(
          this.latestBlockFossil,
          latestBlockFormatted,
          vaultContract
        );
      })
    );
    return transitions;
  }

  async checkAndTransition(
    latestBlockFossil: FormattedBlockData,
    latestBlockStarknet: StarknetBlock,
    vaultContract: Contract
  ): Promise<void> {
    const roundId = await vaultContract.get_current_round_id();
    const roundAddress = await vaultContract.get_round_address(roundId);

    // Convert decimal address to hex
    const roundAddressHex = "0x" + BigInt(roundAddress).toString(16);
    this.logger.info(`Checking round ${roundId} at ${roundAddressHex}`);

    const roundContract = new Contract(
      OptionRoundAbi,
      roundAddressHex,
      vaultContract.account
    );

    const stateRaw = await roundContract.get_state();
    const state = (stateRaw as CairoCustomEnum).activeVariant();

    const stateEnum = OptionRoundState[state as keyof typeof OptionRoundState];

    // Get latest block and its timestamp

    switch (stateEnum) {
      case OptionRoundState.Open:
        await this.stateHandlers.handleOpenState(roundContract, vaultContract);
        break;

      case OptionRoundState.Auctioning:
        await this.stateHandlers.handleAuctioningState(roundContract, vaultContract);
        break;

      case OptionRoundState.Running:
        await this.stateHandlers.handleRunningState(roundContract, vaultContract);
        break;

      case OptionRoundState.Settled:
        this.logger.info("Round is settled - no actions possible");
        break;
    }
  }
}
