import { poseidonHashSingle } from "@scure/starknet";
import { bytesToNumberBE } from "@noble/curves/abstract/utils";
import { OptionRoundStateType, FossilParams } from "@/lib/types";
import { Result } from "starknet";
import { FormattedBlockData } from "@/lib/types";
import { formatUnits } from "ethers";
import { getDemoRoundId } from "./demo/utils";

export const createJobRequestParams = (
  targetTimestamp: number,
  roundDuration: number,
  alpha: number,
  k: number,
) => {
  const DAYS_150 = 3600 * 24 * 150;

  return {
    // TWAP duration is 1 x round duration
    twap: [targetTimestamp - roundDuration, targetTimestamp],
    // Cap level duration is 5 months
    cap_level: [targetTimestamp - 5 * roundDuration, targetTimestamp],
    // Reserve price duration is 5 months
    reserve_price: [targetTimestamp - DAYS_150, targetTimestamp],
    alpha,
    k,
  };
};

export const createJobRequest = ({
  targetTimestamp,
  roundDuration,
  clientAddress,
  vaultAddress,
  alpha,
  k,
}: FossilParams): any => {
  if (!targetTimestamp || !roundDuration || !clientAddress || !vaultAddress)
    return;

  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": "<REPLACE_ME>",
    },
    body: JSON.stringify({
      identifiers: ["PITCH_LAKE_V1"],
      params: createJobRequestParams(
        targetTimestamp,
        roundDuration,
        alpha || 0,
        k || 0,
      ),
      client_info: {
        client_address: clientAddress,
        vault_address: vaultAddress,
        timestamp: targetTimestamp,
      },
    }),
  };
};

export const createJobId = (
  targetTimestamp: number,
  roundDuration: number,
  alpha: number,
  k: number,
): string => {
  if (!targetTimestamp || !roundDuration) return "";

  const identifiers = ["PITCH_LAKE_V1"];
  const params = createJobRequestParams(
    targetTimestamp,
    roundDuration,
    alpha,
    k,
  );

  const input = [
    ...identifiers,
    params.twap[0],
    params.twap[1],
    params.cap_level[0],
    params.cap_level[1],
    params.reserve_price[0],
    params.reserve_price[1],
  ].join("");

  const bytes = new TextEncoder().encode(input);
  const asNum = bytesToNumberBE(bytes);

  const hashResult = poseidonHashSingle(asNum);
  return hashResult.toString();
};

export const getTargetTimestampForRound = (
  roundState: OptionRoundStateType | undefined,
): number => {
  if (
    !roundState ||
    !roundState.roundId ||
    !roundState.roundState ||
    !roundState.deploymentDate ||
    !roundState.optionSettleDate
  )
    return 0;

  const state = roundState.roundState.toString();
  const roundId = roundState.roundId.toString();
  const targetTimestamp = Number(
    state === "Open" && roundId === "1"
      ? roundState.deploymentDate
      : roundState.optionSettleDate,
  );

  return Number(targetTimestamp);
};

export const getDurationForRound = (
  roundState: OptionRoundStateType | undefined,
): number => {
  if (!roundState || !roundState.auctionEndDate || !roundState.optionSettleDate)
    return 0;

  let high = Number(roundState.optionSettleDate);
  let low = Number(roundState.auctionEndDate);
  return Number(high - low);
};

export const getProfitAndLoss = (
  _premiums: bigint | string | number | undefined | Result,
  _totalPayout: bigint | string | number | undefined | Result,
  _optionsSold: bigint | string | number | undefined | Result,
) => {
  const premiums = Number(formatUnits(_premiums?.toString() || "0", "gwei"));
  const totalPayout = Number(
    formatUnits(_totalPayout?.toString() || "0", "gwei"),
  );
  const optionsSold = Number(_optionsSold?.toString() || "0");
  let lpPnL = 0;
  let obPnL = 0;

  if (_optionsSold === 0) return { lpPnL, obPnL };

  lpPnL = (premiums - totalPayout) / optionsSold;
  obPnL = (totalPayout - premiums) / optionsSold;

  return { lpPnL, obPnL };
};

export const getPerformanceLP = (
  _soldLiquidity: bigint | string | number | undefined | Result,
  _premiums: bigint | string | number | undefined | Result,
  _totalPayout: bigint | string | number | undefined | Result,
) => {
  const soldLiquidity = _soldLiquidity
    ? Number(formatUnits(_soldLiquidity.toString(), "gwei"))
    : 0;
  const premiums = _premiums
    ? Number(formatUnits(_premiums.toString(), "gwei"))
    : 0;
  const totalPayout = _totalPayout
    ? Number(formatUnits(_totalPayout.toString(), "gwei"))
    : 0;

  if (soldLiquidity === 0) return 0;

  const gainLoss = premiums - totalPayout;
  const percentage = (gainLoss / soldLiquidity) * 100.0;

  const sign = percentage > 0 ? "+" : "";
  return `${sign}${percentage.toFixed(2)}`;
};

export const getPerformanceOB = (
  _premiums: bigint | string | number | undefined | Result,
  _totalPayout: bigint | string | number | undefined | Result,
) => {
  const premiums = _premiums
    ? Number(formatUnits(_premiums.toString(), "gwei"))
    : 0;
  const totalPayout = _totalPayout
    ? Number(formatUnits(_totalPayout.toString(), "gwei"))
    : 0;

  if (premiums === 0) {
    return 0;
  } else {
    const remainingLiq = totalPayout - premiums;
    const percentage = 100 * (remainingLiq / premiums);

    const sign = percentage > 0 ? "+" : "";
    return `${sign}${percentage.toFixed(2)}`;
  }
};

export const getLocalStorage = (key: string): string => {
  try {
    return localStorage.getItem(key) || "";
  } catch (error) {
    console.log("Error getting from localStorage", error);
    return "";
  }
};

export const shortenString = (str: string) => {
  return str.substring(0, 6) + "..." + str.substring(str.length - 4);
};

export const copyToClipboard = (text: string) =>
  navigator.clipboard.writeText(text);

export const stringToHex = (decimalString?: string): string => {
  if (!decimalString) return "";
  const num = BigInt(decimalString.toString());

  return `0x${num.toString(16)}`;
};

export const removeLeadingZeroes = (hash: string) => {
  if (!hash.startsWith("0x")) {
    throw new Error("Invalid hash: must start with 0x");
  }
  const prefix = "0x";
  const trimmed = hash.slice(2).replace(/^0+/, ""); // Remove leading zeroes
  return prefix + (trimmed || "0"); // Return "0x0" if everything is zero
};
// Utility function to format the number
export const formatNumberText = (number: number) => {
  if (number < 100_000) {
    return number.toLocaleString(); // Return raw number with commas
  } else if (number >= 100_000 && number < 1_000_000) {
    return `${(number / 1_000).toFixed(1)}k`; // Format as '123.45k'
  } else if (number >= 1_000_000 && number < 1_000_000_000) {
    return `${(number / 1_000_000).toFixed(1)}m`; // Format as '123.45m'
  } else {
    return `${(number / 1_000_000_000).toFixed(1)}b`; // Optional for larger numbers like '123.45b'
  }
};

export const timeFromNow = (timestamp: string) => {
  const now = new Date().getTime() / 1000;
  return timeUntilTarget(now.toString(), timestamp);
};

export const timeUntilTarget = (
  currentTimestamp: string,
  targetTimestamp: string,
): string => {
  const currentDate = new Date(Number(currentTimestamp) * 1000);
  const targetDate = new Date(Number(targetTimestamp) * 1000);

  // Calculate the difference in milliseconds
  const diffInMs = targetDate.getTime() - currentDate.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMsAbs = Math.abs(diffInMs);

  // Convert milliseconds to meaningful units
  const msInDay = 24 * 60 * 60 * 1000;
  const msInHour = 60 * 60 * 1000;
  const msInMinute = 60 * 1000;
  const msInSecond = 1000;

  const days = Math.floor(diffInMsAbs / msInDay);
  const hours = Math.floor((diffInMsAbs % msInDay) / msInHour);
  const minutes = Math.floor((diffInMsAbs % msInHour) / msInMinute);
  const seconds = Math.floor((diffInMsAbs % msInMinute) / msInSecond);

  if (diffInSeconds > 0) {
    // Future time
    let timeString = "";
    if (days > 0) timeString += `${days}d `;
    if (hours > 0) timeString += `${hours}h `;
    if (minutes > 0) timeString += `${minutes}m `;
    if (days === 0 && hours === 0 && seconds > 0) timeString += `${seconds}s `;
    return timeString.trim() || "Now";
  } else if (diffInSeconds === 0) {
    return "Now";
  } else {
    // Past time
    if (diffInSeconds > -60) {
      return "Now";
    }
    let timeString = "";
    if (days > 0) timeString += `${days}d `;
    if (hours > 0) timeString += `${hours}h `;
    if (minutes > 0) timeString += `${minutes}m `;
    if (days === 0 && hours === 0 && minutes === 0 && seconds > 0)
      timeString += `${seconds}s `;
    return `${timeString.trim()} ago`;
  }
};

export const timeUntilTargetFormal = (timestamp: string, target: string) => {
  const timestampDate = new Date(Number(timestamp) * 1000);
  const targetDate = new Date(Number(target) * 1000);

  // Calculate the difference in milliseconds
  const diffInMs = targetDate.getTime() - timestampDate.getTime();
  const sign = diffInMs < 0 ? "-" : "";
  const diffInMsAbs = Math.abs(diffInMs);

  // Convert milliseconds to meaningful units
  const msInDay = 24 * 60 * 60 * 1000;
  const msInHour = 60 * 60 * 1000;
  const msInMinute = 60 * 1000;
  const msInSecond = 1000;

  const days = Math.floor(diffInMsAbs / msInDay);
  const hours = Math.floor((diffInMsAbs % msInDay) / msInHour);
  const minutes = Math.floor((diffInMsAbs % msInHour) / msInMinute);
  const seconds = Math.floor((diffInMsAbs % msInMinute) / msInSecond);

  let str = `${sign}`;
  str += days > 0 ? `${days} ${days === 1 ? "Day" : "Days"} ` : "";
  str += hours > 0 ? `${hours} ${hours === 1 ? "Hour" : "Hours"} ` : "";
  str +=
    minutes > 0 ? `${minutes} ${minutes === 1 ? "Minute" : "Minutes"} ` : "";

  if (
    (days === 0 && sign === "" && seconds > 0) ||
    (sign === "-" && days === 0 && hours <= 2)
  )
    str += `${seconds} ${seconds === 1 ? "Second" : "Seconds"}`;

  return str;
};

export const stringToHexString = (input?: string): string => {
  if (!input) return "";

  // If the input is a number, handle it as before
  if (!isNaN(Number(input))) {
    const num = BigInt(input.toString());
    return `0x${num.toString(16)}`;
  }

  // For text strings, convert to hex
  const hex = Array.from(input)
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("");
  return `0x${hex}`;
};

export const isValidHex64 = (input: string): boolean => {
  if (!input.startsWith("0x")) return false;

  // Remove '0x' prefix and any leading zeros
  const hexPart = input.slice(2).toLowerCase();

  // Check if the remaining characters are valid hex
  const validHexRegex = /^[a-f0-9]+$/;
  if (!validHexRegex.test(hexPart)) return false;

  // Check if the length is less than or equal to 64 (after removing '0x')
  return hexPart.length <= 64;
};

// Format an Eth amount to a readable string
export const formatNumber = (num: number): string => {
  // Ensure the input is a number
  if (typeof num !== "number" || isNaN(num)) {
    throw new TypeError("Input must be a valid number");
  }

  const numString = num.toString();

  if (numString.includes(".")) {
    if (num < 0.00001) return "< 0.00001";
    const [whole, decimal] = numString.split(".");
    return `${whole}.${decimal.slice(0, 5)}`;
  }

  return numString;

  //return num.toString();

  //// Handle negative numbers by working with their absolute values
  //const absNum = Math.abs(num);
  //let truncatedNumber: number;
  //let formattedNumber: string;

  //const truncate = (value: number, decimals: number): number => {
  //  const factor = Math.pow(10, decimals);
  //  return Math.floor(value * factor) / factor;
  //};

  //if (absNum >= 10) {
  //  truncatedNumber = truncate(absNum, 1);
  //  formattedNumber = truncatedNumber.toFixed(1);
  //} else if (absNum >= 1) {
  //  truncatedNumber = truncate(absNum, 2);
  //  formattedNumber = truncatedNumber.toFixed(2);
  //} else if (absNum >= 0.00001) {
  //  truncatedNumber = truncate(absNum, 5);
  //  formattedNumber = truncatedNumber.toFixed(5);
  //} else if (absNum === 0) {
  //  formattedNumber = "0.00000";
  //} else {
  //  formattedNumber = "< 0.00001";
  //}

  ////if (absNum >= 10) {
  ////  formattedNumber = num.toFixed(1);
  ////} else if (absNum >= 1) {
  ////  formattedNumber = num.toFixed(2);
  ////}
  //////  else if (absNum >= 0.001) {
  //////    formattedNumber = num.toFixed(3);
  //////  }
  ////else if (absNum >= 0.00001) {
  ////  formattedNumber = num.toFixed(5);
  ////} else if (absNum === 0) {
  ////  formattedNumber = "0.000";
  ////} else {
  ////  formattedNumber = "< 0.00001";
  ////}

  //return formattedNumber;
};

export const getTWAPs = (
  //blockData: FormattedBlockData[],
  blockData: any[],
  firstTimestamp: number,
  _twapRange: number,
): FormattedBlockData[] => {
  if (!blockData?.length || _twapRange <= 0)
    return blockData.map((b) => ({ ...b }));

  const twapRange = process.env.ENVIRONMENT === "demo" ? 60 : _twapRange;

  const dataWithTWAP: FormattedBlockData[] = blockData.map(
    (currentBlock, currentIndex) => {
      const currentTime = currentBlock.timestamp;

      // Skip if it's before our requested start
      if (currentTime < firstTimestamp) {
        return { ...currentBlock };
      }

      // 2A. Compute the start of the window
      const windowStart = currentTime - twapRange;

      // 2B. We build "segments" so we can do the integral over time intervals.
      //     Each segment has { startTimestamp, baseFee } indicating the baseFee
      //     is valid from startTimestamp up to the next segment’s startTimestamp.
      let segments: { start: number; fee: number }[] = [];
      let lastKnownFee: number | undefined = undefined;

      /**
       * STEP: Find the last known fee at or *before* windowStart (for interpolation).
       * We'll traverse backward from currentIndex to see if there's a data point
       * that is <= windowStart.
       */
      for (let i = currentIndex; i >= 0; i--) {
        const b = blockData[i];
        if (b.basefee !== undefined && b.timestamp <= currentTime) {
          if (b.timestamp <= windowStart) {
            lastKnownFee = b.basefee;
            break;
          } else {
            lastKnownFee = b.basefee;
            // Keep going in case there's an even earlier block that’s still <= windowStart
          }
        }
      }

      if (lastKnownFee === undefined) {
        for (let i = 0; i <= currentIndex; i++) {
          if (blockData[i].basefee !== undefined) {
            lastKnownFee = blockData[i].basefee;
            break;
          }
        }
      }

      // If still undefined, that means we have no known fees at all => twap is undefined
      if (lastKnownFee === undefined) {
        return { ...currentBlock };
      }

      // 2C. Build up the segments from windowStart to currentTime, using
      //     the known block times in [windowStart, currentTime].
      let prevTs = windowStart;
      let prevFee = lastKnownFee;

      for (let i = 0; i <= currentIndex; i++) {
        const b = blockData[i];
        if (
          b.basefee !== undefined &&
          b.timestamp >= windowStart &&
          b.timestamp <= currentTime
        ) {
          // We have a block inside the window -> close out the segment from prevTs to b.timestamp
          if (b.timestamp > prevTs) {
            segments.push({ start: prevTs, fee: prevFee });
          }
          // Now start a new segment from b.timestamp, with b's fee
          prevTs = b.timestamp;
          prevFee = b.basefee;
        }
      }

      // 2D. Finally, push the last segment from prevTs to currentTime
      if (currentTime > prevTs) {
        segments.push({ start: prevTs, fee: prevFee });
      }

      // 2E. Calculate the time-weighted average
      let weightedSum = 0;
      let totalSeconds = 0;

      for (let i = 0; i < segments.length; i++) {
        const startSegment = segments[i].start;
        const endSegment =
          i < segments.length - 1 ? segments[i + 1].start : currentTime;

        const delta = endSegment - startSegment;
        if (delta > 0) {
          weightedSum += segments[i].fee * delta;
          totalSeconds += delta;
        }
      }

      if (totalSeconds === 0) {
        return { ...currentBlock, twap: Number(prevFee) };
      } else {
        return { ...currentBlock, twap: weightedSum / Number(totalSeconds) };
      }
    },
  );

  const filtered = dataWithTWAP
    .filter((b) => {
      return b.timestamp >= firstTimestamp;
    })
    .map((oldBlock: FormattedBlockData) => {
      if (oldBlock.isUnconfirmed) {
        return {
          ...oldBlock,
          unconfirmedTwap: oldBlock.twap,
          unconfirmedBasefee: oldBlock.basefee,
        };
      } else {
        if (oldBlock.basefee != undefined) {
          return {
            ...oldBlock,
            confirmedTwap: oldBlock.twap,
            confirmedBasefee: oldBlock.basefee,
          };
        } else {
          return oldBlock;
        }
      }
    });

  return filtered;
};

export const scaleInRange = (
  value: number | undefined,
  inRange: number[],
  outRange: number[],
) => {
  if (!value) return 0;
  const inMin = inRange[0];
  const outMin = outRange[0];

  const inMax = inRange[1];
  const outMax = outRange[1];

  const result =
    ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;

  if (result < outMin) {
    return outMin;
  } else if (result > outMax) {
    return outMax;
  }

  return result;
};

export const roundIdFormatter = (roundId: string, conn: string): string => {
  let id: string = roundId;

  if (conn === "demo") id = getDemoRoundId(Number(roundId)).toString();

  if (id.length === 1) id = `0${id}`;

  return `Round ${id}`;
};

///   function generateMockData(
///     startDate: string,
///     itemCount: number,
///     stepInSeconds: number,
///   ) {
///     const data = [];
///     const start = new Date(startDate);
///     start.setSeconds(0, 0); // Ensure the date starts at the beginning of the minute
///
///     let previousBaseFee: number | null = null;
///
///     const baseFeeMin = 2;
///     const baseFeeMax = 60;
///
///     for (let i = 0; i < itemCount; i++) {
///       const currentTime = new Date(start.getTime() + i * stepInSeconds * 1000); // Add stepInSeconds seconds
///
///       // Get Unix timestamp in seconds
///       const timestamp = Math.floor(currentTime.getTime() / 1000);
///
///       // BaseFee target with seasonality
///       const baseFeeTarget = 30 + 10 * Math.sin((2 * Math.PI * i) / itemCount); // Seasonality between 20 and 40 gwei
///
///       // BASEFEE calculation
///       let baseFee: number;
///       if (previousBaseFee === null) {
///         baseFee = 15; // Starting BASEFEE
///       } else {
///         // Calculate drift towards target
///         const drift = (baseFeeTarget - previousBaseFee) * 0.05; // 5% of the distance to target
///
///         // Random noise, ±12.5% of previousBaseFee
///         const randomFactor = getRandomNumber(0.875, 1.125);
///
///         baseFee = previousBaseFee * randomFactor + drift;
///
///         // Introduce upward bias if baseFee is too low
///         if (baseFee < 5) {
///           baseFee += getRandomNumber(1, 3); // Add 1 to 3 gwei
///         }
///
///         // Introduce downward bias if baseFee is too high
///         if (baseFee > 55) {
///           baseFee -= getRandomNumber(1, 3); // Subtract 1 to 3 gwei
///         }
///
///         // Ensure baseFee stays within bounds
///         if (baseFee < baseFeeMin) {
///           baseFee = baseFeeMin;
///         } else if (baseFee > baseFeeMax) {
///           baseFee = baseFeeMax;
///         }
///       }
///
///       baseFee = parseFloat(baseFee.toFixed(2));
///
///       // TWAP calculation
///       const TWAP = baseFee + getRandomNumber(-1, 1); // Slight variation
///       const twapValue = parseFloat(TWAP.toFixed(2));
///
///       // Add the data point
///       data.push({
///         timestamp,
///         BASEFEE: baseFee,
///         TWAP: twapValue,
///       });
///
///       // Update previousBaseFee for the next iteration
///       previousBaseFee = baseFee;
///     }
///
///     return data;
///   }
///
///   // Helper function to generate a random number between min and max
///   function getRandomNumber(min: number, max: number): number {
///     return Math.random() * (max - min) + min;
///   }
///
///   const mockData = generateMockData("2024-11-21T01:11:00Z", 10000, 20); // 20 seconds x 10000 steps ~ 2 days
///   console.log(JSON.stringify(mockData, null, 2));
