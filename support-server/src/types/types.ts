export interface StateTransitionConfig {
  starknetRpcUrl: string;
  starknetPrivateKey: string;
  starknetAccountAddress: string;
  fossilApiKey: string;
  fossilApiUrl: string;
  vaultAddresses: string[];
}

enum OptionRoundState {
  Open = 0,
  Auctioning = 1,
  Running = 2,
  Settled = 3,
}

export type FossilRequest = {
  program_id: string;
  vault_address: string;
  params: {
    twap: { 0: Number; 1: Number };
    max_return: { 0: Number; 1: Number };
    reserve_price: { 0: Number; 1: Number };
  };
};

export type StarknetBlock = {
  blockNumber: number;
  timestamp: number;
};
export { OptionRoundState };
