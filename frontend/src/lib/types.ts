import { DemoFossilCallParams } from "@/app/api/sendMockFossilCallback/route";
import { ReactNode } from "react";

export interface StatusModalProps {
  txnHeader: string;
  txnOutcome: ReactNode | string;
  txnHash: string;
  version: "success" | "failure" | "pending" | null;
}

export type FossilParams = {
  targetTimestamp: number | undefined;
  roundDuration: number | undefined;
  clientAddress: string | undefined;
  vaultAddress: string | undefined;
  alpha: number | undefined;
  k: number | undefined;
};

export type DepositArgs = {
  beneficiary: string;
  amount: number | bigint;
};

export type WithdrawLiquidityArgs = {
  amount: number | bigint;
};

export type QueueArgs = { bps: number | bigint };

export type CollectArgs = { account: string };

export type ApprovalArgs = {
  amount: number | bigint;
  spender: string;
};

export type U256 = {
  low: string | number | bigint;
  high: string | number | bigint;
};

export type L1DataVol = {
  twap: U256;
  volatility: number | string;
  reserve_price: U256;
};

export type L1DataCap = {
  twap: U256;
  cap_level: number | string;
  reserve_price: U256;
};

export type L1Data = L1DataVol | L1DataCap;

export type FossilCallbackArgs = {
  l1_data: L1Data;
  timestamp: number | string;
};

export type TransactionResult = {
  transaction_hash: string;
};

export enum RoundState {
  Open = 0, // Accepting deposits, waiting for auction to start
  Auctioning = 1, // Auction is on going, accepting bids
  Running = 2, // Auction has ended, waiting for option round expiry date to settle
  Settled = 3,
}

export const RoundStateLabels: { [key in RoundState]: string } = {
  [RoundState.Open]: "Open",
  [RoundState.Auctioning]: "Auctioning",
  [RoundState.Running]: "Running",
  [RoundState.Settled]: "Settled",
};

export type VaultStateType = {
  address: string;
  vaultType: string;
  latestBlock?: string;
  alpha: number | bigint | string;
  strikeLevel: number | bigint | string;
  ethAddress: string;
  l1DataProcessorAddress: string;
  currentRoundId: number | bigint | string;
  lockedBalance: number | bigint | string;
  unlockedBalance: number | bigint | string;
  stashedBalance: number | bigint | string;
  queuedBps: number | bigint | string;
  now: number | bigint | string;
  deploymentDate: string;
  currentRoundAddress: string;
};

export type LiquidityProviderStateType = {
  address: string;
  lockedBalance: number | bigint | string;
  unlockedBalance: number | bigint | string;
  stashedBalance: number | bigint | string;
  queuedBps: number | bigint | string;
};

export type OptionBuyerStateType = {
  address: string;
  bidHashes?: string;
  bids?: Bid[] | any;
  roundAddress: string;
  hasMinted?: boolean;
  hasRefunded?: boolean;
  mintableOptions: bigint | number | string;
  refundableOptions: bigint | number | string;
  totalOptions: bigint | number | string;
  payoutBalance: bigint | number | string;
};

export type VaultActionsType = {
  // LP
  depositLiquidity: (depositArgs: DepositArgs) => Promise<string>;
  withdrawLiquidity: (withdrawArgs: WithdrawLiquidityArgs) => Promise<string>;
  withdrawStash: (collectArgs: CollectArgs) => Promise<string>;
  queueWithdrawal: (queueArgs: QueueArgs) => Promise<string>;
  // OB
  placeBid: (placeBids: PlaceBidArgs) => Promise<string>;
  updateBid: (updateBid: UpdateBidArgs) => Promise<string>;
  refundUnusedBids: (refundBids: RefundBidsArgs) => Promise<string>;
  mintOptions: (mintOptions: MintOptionsArgs) => Promise<string>;
  exerciseOptions: (exerciseOptions: ExerciseOptionsArgs) => Promise<string>;
  // STATE TRANSITION
  startAuction: () => Promise<void>;
  endAuction: () => Promise<void>;
  settleOptionRound: () => Promise<void>;
  demoFossilCallback: (fossilArgs: DemoFossilCallParams) => Promise<boolean>;
  sendFossilRequest: (
    fossilRequest: SendFossiLRequestParams,
  ) => Promise<string>;
};

export type SendFossiLRequestParams = {
  targetTimestamp: number;
  roundDuration: number;
  clientAddress: string;
  vaultAddress: string;
  alpha: number;
  k: number;
};

export type OptionRoundStateType = {
  address: string | undefined;
  vaultAddress: string;
  roundId: bigint | number | string;
  roundState: string;
  deploymentDate: string | number | bigint;
  auctionStartDate: string | number | bigint;
  auctionEndDate: string | number | bigint;
  optionSettleDate: string | number | bigint;
  startingLiquidity?: bigint | number | string;
  soldLiquidity: bigint | number | string;
  unsoldLiquidity: bigint | number | string;
  reservePrice: bigint | number | string;
  strikePrice: bigint | number | string;
  capLevel: bigint | number | string;
  availableOptions: bigint | number | string;
  optionSold: bigint | number | string;
  clearingPrice: bigint | number | string;
  premiums: bigint | number | string;
  settlementPrice: bigint | number | string;
  optionsSold: bigint | number | string;
  totalPayout: bigint | number | string;
  payoutPerOption: bigint | number | string;
  treeNonce: bigint | number | string;
  performanceLP: string;
  performanceOB: string;
};

export type Bid = {
  address: string; //owner ?
  roundAddress: string;
  bidId: string;
  treeNonce: string;
  amount: bigint | number | string;
  price: bigint | number | string;
};

export interface VaultDetailsProps {
  vaultAddress: string;
  status: RoundState;
  alpha: number;
  strike: number;
  strike_level: number;
  tvl: number;
  round: number;
  timeLeft?: string;
  capLevel: number;
  roundID: number;
  type: string;
  fees: number;
  apy?: number;
  pnl?: number;
  lastRoundPerf: number;
  currRoundPerf?: number;
  actions: string;
  deploymentDate: string | number | bigint;
  auctionStartDate: string | number | bigint;
  auctionEndDate: string | number | bigint;
  optionSettleDate?: string | number | bigint;
}

export type WebSocketData = {
  wsVaultState: VaultStateType | undefined;
  wsOptionRoundStates: OptionRoundStateType[];
  wsLiquidityProviderState: LiquidityProviderStateType | undefined;
  wsOptionBuyerStates: OptionBuyerStateType[];
};

export type MockData = {
  vaultState: VaultStateType;
  lpState: LiquidityProviderStateType;
  vaultActions: VaultActionsType;
  optionRoundStates: OptionRoundStateType[];
  optionBuyerStates: OptionBuyerStateType[];
};

export type PlaceBidArgs = {
  amount: number | bigint;
  price: number | bigint;
};
export type UpdateBidArgs = {
  bidId: string;
  priceIncrease: number | bigint;
};
export type MintOptionsArgs = {
  roundAddress: string;
};
export type RefundableBidsArgs = {
  roundAddress: string;
  optionBuyer: string;
};
export type RefundBidsArgs = {
  roundAddress: string;
  optionBuyer: string;
};
export type ExerciseOptionsArgs = {
  roundAddress: string;
};

export interface InfoItemProps {
  label: string;
  value: React.ReactNode;
  isPending?: boolean;
}

export interface BalanceTooltipProps {
  balance: {
    locked: string;
    unlocked: string;
    stashed: string;
  };
}

export enum CommonTabs {
  MyInfo = "My Info",
}

export enum ProviderTabs {
  Deposit = "Deposit",
  Withdraw = "Withdraw",
}

export enum BuyerTabs {
  PlaceBid = "Place Bid",
  History = "History",
  Refund = "Refund",
  Mint = "Mint",
  Exercise = "Exercise",
}

export enum WithdrawSubTabs {
  Unlocked = "Unlocked",
  Locked = "Locked",
  Stashed = "Stashed",
}

// Define a type for the user role
export enum VaultUserRole {
  Provider = "Provider",
  Buyer = "Buyer",
}

// Define a discriminated union for tabs based on user role
export type TabType =
  | { role: VaultUserRole.Provider; tab: ProviderTabs | CommonTabs }
  | {
      role: VaultUserRole.Buyer;
      tab: BuyerTabs | CommonTabs;
      state: RoundState;
    };

export interface TabsProps {
  tabs: string[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
}


export interface RawBlockData {
  block_number?: number;
  base_fee_per_gas?: string;
  timestamp: number;
}

export interface FormattedBlockData {
  blockNumber?: number | undefined;
  timestamp: number;
  basefee?: number | undefined;
  twap?: number | undefined;
  confirmedBasefee?: number | undefined;
  confrimedTwap?: number | undefined;
  isUnconfirmed?: boolean;
  unconfirmedBasefee?: number | undefined;
  unconfrimedTwap?: number | undefined;
}
