export interface ConfirmedTWAPsConfig {
  fossilDbConnectionString: string;
  pitchlakeDbConnectionString: string;
  useDemoData: boolean;
  twapRanges: {
    TWELVE_MIN: number;
    THREE_HOURS: number;
    THIRTY_DAYS: number;
  };
}

export const TWAP_RANGES = {
  TWELVE_MIN: 12 * 60, // 12 minutes
  THREE_HOURS: 3 * 60 * 60, // 3 hours
  THIRTY_DAYS: 30 * 24 * 60 * 60, // 30 days
} as const;

export function loadConfirmedTWAPsConfig(): ConfirmedTWAPsConfig {
  const useDemoData = process.env.USE_DEMO_DATA === 'true';
  
  if (!useDemoData) {
    if (!process.env.FOSSIL_DB_CONNECTION_STRING) {
      throw new Error("FOSSIL_DB_CONNECTION_STRING is required in production mode");
    }
    if (!process.env.PITCHLAKE_DB_CONNECTION_STRING) {
      throw new Error("PITCHLAKE_DB_CONNECTION_STRING is required in production mode");
    }
  }

  return {
    fossilDbConnectionString: process.env.FOSSIL_DB_CONNECTION_STRING || '',
    pitchlakeDbConnectionString: process.env.PITCHLAKE_DB_CONNECTION_STRING || '',
    useDemoData,
    twapRanges: TWAP_RANGES
  };
} 