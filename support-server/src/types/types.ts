export interface StateTransitionConfig {
  starknetRpcUrl: string;
  starknetPrivateKey: string;
  starknetAccountAddress: string;
  fossilApiKey: string;
  fossilApiUrl: string;
  vaultAddresses: string[];
}

export enum JobStatus {
  Pending = "Pending",
  Completed = "Completed",
  Failed = "Failed",
  NOT_FOUND = "not_found",
}

export type JobRequest = {
  job_id: string;
  status: JobStatus;
  vaultAddress: string;
}

enum OptionRoundState {
  Open = 0,
  Auctioning = 1, 
  Running = 2,
  Settled = 3
}

export type FossilRequest = {
  vaultAddress: string,    
  timestamp: number,      
  identifier: string   
};


export type StarknetBlock = {
  blockNumber: number;
  timestamp: number;
};
export { OptionRoundState };