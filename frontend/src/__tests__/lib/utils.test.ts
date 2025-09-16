import {
  shortenString,
  formatNumberText,
  stringToHex,
  removeLeadingZeroes,
  getPerformanceLP,
  getPerformanceOB,
  timeFromNow,
  timeUntilTarget,
  timeUntilTargetFormal,
  createJobRequestParams,
  createJobRequest,
  createJobId,
  getTargetTimestampForRound,
  getDurationForRound,
} from "@/lib/utils";
import { OptionRoundStateType } from "@/lib/types";

describe("shortenString", () => {
  it("shortens a long string correctly", () => {
    const input = "0x1234567890abcdef1234567890abcdef12345678";
    const expected = "0x1234...5678";
    expect(shortenString(input)).toBe(expected);
  });

  it("handles short strings consistently", () => {
    const input = "0x1234";
    const expected = "0x1234...1234";
    expect(shortenString(input)).toBe(expected);
  });
});

describe("formatNumberText", () => {
  it("formats numbers less than 100k with commas", () => {
    expect(formatNumberText(1234)).toBe("1,234");
    expect(formatNumberText(99999)).toBe("99,999");
  });

  it("formats numbers between 100k and 1M with k suffix", () => {
    expect(formatNumberText(123456)).toBe("123.5k");
    expect(formatNumberText(999999)).toBe("1000.0k");
  });

  it("formats numbers between 1M and 1B with m suffix", () => {
    expect(formatNumberText(1234567)).toBe("1.2m");
    expect(formatNumberText(999999999)).toBe("1000.0m");
  });

  it("formats numbers greater than 1B with b suffix", () => {
    expect(formatNumberText(1234567890)).toBe("1.2b");
  });
});

describe("stringToHex", () => {
  it("converts decimal string to hex", () => {
    expect(stringToHex("255")).toBe("0xff");
    expect(stringToHex("16")).toBe("0x10");
  });

  it("handles empty or undefined input", () => {
    expect(stringToHex()).toBe("");
    expect(stringToHex("")).toBe("");
  });
});

describe("removeLeadingZeroes", () => {
  it("removes leading zeroes from hex string", () => {
    expect(removeLeadingZeroes("0x00001234")).toBe("0x1234");
    expect(removeLeadingZeroes("0x0000")).toBe("0x0");
  });

  it("throws error for invalid hex string", () => {
    expect(() => removeLeadingZeroes("1234")).toThrow(
      "Invalid hash: must start with 0x",
    );
  });
});

describe("getPerformanceLP", () => {
  it("calculates positive performance correctly", () => {
    expect(getPerformanceLP("1000", "200", "100")).toBe("+10.00");
  });

  it("calculates negative performance correctly", () => {
    expect(getPerformanceLP("1000", "100", "200")).toBe("-10.00");
  });

  it("returns 0 when sold liquidity is 0", () => {
    expect(getPerformanceLP("0", "100", "200")).toBe(0);
  });
});

describe("getPerformanceOB", () => {
  it("calculates positive performance correctly", () => {
    expect(getPerformanceOB("100", "150")).toBe("+50.00");
  });

  it("calculates negative performance correctly", () => {
    expect(getPerformanceOB("100", "50")).toBe("-50.00");
  });

  it("returns 0 when premiums is 0", () => {
    expect(getPerformanceOB("0", "100")).toBe(0);
  });
});

describe("time utilities", () => {
  describe("timeUntilTarget", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2024-01-01T00:00:00Z"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("formats positive time difference correctly", () => {
      const now = "1704067200"; // 2024-01-01T00:00:00Z
      const target = "1704153600"; // 2024-01-02T00:00:00Z (1 day later)
      expect(timeUntilTarget(now, target)).toBe("1d");
    });

    it("formats negative time difference correctly", () => {
      const now = "1704153600"; // 2024-01-02T00:00:00Z
      const target = "1704067200"; // 2024-01-01T00:00:00Z (1 day earlier)
      expect(timeUntilTarget(now, target)).toBe("1d ago");
    });

    it("formats time units correctly", () => {
      const now = "1704067200"; // 2024-01-01T00:00:00Z
      const target = "1704067260"; // 60 seconds later
      expect(timeUntilTarget(now, target)).toBe("1m");
    });
  });

  describe("timeUntilTargetFormal", () => {
    it("formats time with proper unit names", () => {
      const now = "1704067200"; // 2024-01-01T00:00:00Z
      const target = "1704153600"; // 2024-01-02T00:00:00Z (1 day later)
      expect(timeUntilTargetFormal(now, target)).toBe("1 Day ");
    });

    it("uses plural forms correctly", () => {
      const now = "1704067200"; // 2024-01-01T00:00:00Z
      const target = "1704240000"; // 2024-01-03T00:00:00Z (2 days later)
      expect(timeUntilTargetFormal(now, target)).toBe("2 Days ");
    });
  });

  describe("timeFromNow", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2024-01-01T00:00:00Z"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("calculates time from current timestamp", () => {
      const target = "1704153600"; // 2024-01-02T00:00:00Z (1 day from 2024-01-01)
      expect(timeFromNow(target)).toBe("1d");
    });
  });
});

describe("createJobRequestParams", () => {
  it("creates correct job request parameters", () => {
    const DAYS150 = 3600 * 24 * 150; // 150 days in seconds
    const targetTimestamp = 1704067200; // 2024-01-01T00:00:00Z
    const roundDuration = 3600; // 1 hour
    const alpha = 2345;
    const k = 0;

    const result = createJobRequestParams(
      targetTimestamp,
      roundDuration,
      alpha,
      k,
    );

    expect(result).toEqual({
      twap: [targetTimestamp - roundDuration, targetTimestamp],
      cap_level: [targetTimestamp - 5 * roundDuration, targetTimestamp],
      reserve_price: [targetTimestamp - DAYS150, targetTimestamp],
      alpha,k
    });
  });
});

describe("createJobRequest", () => {
  it("creates correct job request object", () => {
    const params = {
      targetTimestamp: 1704067200,
      roundDuration: 3600,
      clientAddress: "0x123",
      vaultAddress: "0x456",
      alpha: 2345,
      k: 0,
    };

    const result = createJobRequest(params);

    expect(result).toEqual({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "<REPLACE_ME>",
      },
      body: JSON.stringify({
        identifiers: ["PITCH_LAKE_V1"],
        params: createJobRequestParams(
          params.targetTimestamp,
          params.roundDuration,
          params.alpha,
          params.k,
        ),
        client_info: {
          client_address: params.clientAddress,
          vault_address: params.vaultAddress,
          timestamp: params.targetTimestamp,
        },
      }),
    });
  });

  it("returns undefined when parameters are missing", () => {
    expect(createJobRequest({} as any)).toBeUndefined();
  });
});

describe("createJobId", () => {
  it("creates a job ID string", () => {
    const targetTimestamp = 1704067200;
    const roundDuration = 3600;
    const alpha = 2345;
    const k = 0;

    const result = createJobId(targetTimestamp, roundDuration, alpha, k);

    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns empty string when parameters are missing", () => {
    expect(createJobId(0, 0, 0, 0)).toBe("");
  });
});

describe("getTargetTimestampForRound", () => {
  it("returns deploymentDate for first round in Open state", () => {
    const roundState: OptionRoundStateType = {
      address: "0x123",
      vaultAddress: "0x456",
      roundId: "1",
      roundState: "Open",
      deploymentDate: "1704067200",
      optionSettleDate: "1704070800",
      auctionEndDate: "1704068400",
      auctionStartDate: "1704067200",
      startingLiquidity: "1000000000000000000",
      soldLiquidity: "0",
      unsoldLiquidity: "0",
      reservePrice: "0",
      strikePrice: "0",
      capLevel: "0",
      availableOptions: "0",
      optionSold: "0",
      clearingPrice: "0",
      premiums: "0",
      settlementPrice: "0",
      optionsSold: "0",
      totalPayout: "0",
      payoutPerOption: "0",
      treeNonce: "0",
      performanceLP: "0",
      performanceOB: "0",
    };

    expect(getTargetTimestampForRound(roundState)).toBe(1704067200);
  });

  it("returns optionSettleDate for other rounds", () => {
    const roundState: OptionRoundStateType = {
      address: "0x123",
      vaultAddress: "0x456",
      roundId: "2",
      roundState: "Open",
      deploymentDate: "1704067200",
      optionSettleDate: "1704070800",
      auctionEndDate: "1704068400",
      auctionStartDate: "1704067200",
      startingLiquidity: "1000000000000000000",
      soldLiquidity: "0",
      unsoldLiquidity: "0",
      reservePrice: "0",
      strikePrice: "0",
      capLevel: "0",
      availableOptions: "0",
      optionSold: "0",
      clearingPrice: "0",
      premiums: "0",
      settlementPrice: "0",
      optionsSold: "0",
      totalPayout: "0",
      payoutPerOption: "0",
      treeNonce: "0",
      performanceLP: "0",
      performanceOB: "0",
    };

    expect(getTargetTimestampForRound(roundState)).toBe(1704070800);
  });

  it("returns 0 when roundState is undefined", () => {
    expect(getTargetTimestampForRound(undefined)).toBe(0);
  });

  it("returns 0 when required fields are missing", () => {
    const roundState = {} as OptionRoundStateType;
    expect(getTargetTimestampForRound(roundState)).toBe(0);
  });
});

describe("getDurationForRound", () => {
  it("calculates correct duration between auction end and option settle", () => {
    const roundState: OptionRoundStateType = {
      address: "0x123",
      vaultAddress: "0x456",
      roundId: "1",
      roundState: "Open",
      deploymentDate: "1704067200",
      optionSettleDate: "1704070800",
      auctionEndDate: "1704068400",
      auctionStartDate: "1704067200",
      startingLiquidity: "1000000000000000000",
      soldLiquidity: "0",
      unsoldLiquidity: "0",
      reservePrice: "0",
      strikePrice: "0",
      capLevel: "0",
      availableOptions: "0",
      optionSold: "0",
      clearingPrice: "0",
      premiums: "0",
      settlementPrice: "0",
      optionsSold: "0",
      totalPayout: "0",
      payoutPerOption: "0",
      treeNonce: "0",
      performanceLP: "0",
      performanceOB: "0",
    };

    expect(getDurationForRound(roundState)).toBe(2400); // 40 minutes
  });

  it("returns 0 when roundState is undefined", () => {
    expect(getDurationForRound(undefined)).toBe(0);
  });

  it("returns 0 when required fields are missing", () => {
    const roundState = {} as OptionRoundStateType;
    expect(getDurationForRound(roundState)).toBe(0);
  });
});
