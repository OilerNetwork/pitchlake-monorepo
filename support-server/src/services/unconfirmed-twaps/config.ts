

export interface UnconfirmedIndexerConfig {
  mainnetRpcUrl: string;
  useDemoData: boolean;
  twapRanges: {
    TWELVE_MIN: number;
    THREE_HOURS: number;
    THIRTY_DAYS: number;
  };
}

export const TWAP_RANGES = {
  TWELVE_MIN: 12 * 60,
  THREE_HOURS: 3 * 60 * 60,
  THIRTY_DAYS: 30 * 24 * 60 * 60,
} as const;

export function loadUnconfirmedIndexerConfig(): UnconfirmedIndexerConfig {
  const useDemoData = process.env.USE_DEMO_DATA === 'true';
  
  if (!useDemoData && !process.env.L1_ALCHEMY_URL) {
    throw new Error("L1_ALCHEMY_URL is required in production mode");
  }

  return {
    mainnetRpcUrl: process.env.L1_ALCHEMY_URL || 'https://eth-mainnet.alchemyapi.io/v2/demo',
    useDemoData,
    twapRanges: TWAP_RANGES
  };
} 