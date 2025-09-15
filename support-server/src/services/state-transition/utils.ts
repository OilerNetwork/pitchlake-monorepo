import { FossilRequest } from "../../types/types";
import axios from "axios";
import { Contract } from "starknet";
import { Logger } from "winston";

const { FOSSIL_API_KEY, FOSSIL_API_URL } = process.env;

export const formatTimeLeft = (current: number, target: number) => {
  const secondsLeft = Number(target) - Number(current);
  const hoursLeft = secondsLeft / 3600;
  return `${secondsLeft} seconds (${hoursLeft.toFixed(2)} hrs)`;
};

export const formatRawToFossilRequest = (rawData: any) => {
  return {
    vaultAddress: "0x" + rawData[0].toString(16),
    timestamp: Number(rawData[1]),
    identifier: "0x" + rawData[2].toString(16),
  };
};

export const sendFossilRequest = async (
  requestData: FossilRequest,
  clientAddress: string,
  vaultContract: Contract,
  logger: Logger,
) => {
  // Format request data
  const vaultAddress = requestData.vaultAddress;
  const requestTimestamp = Number(requestData.timestamp);
  const identifier = requestData.identifier;

  // Get round duration from vault contract
  const roundDuration = Number(await vaultContract.get_round_duration());

  // Calculate windows for each metric
  const twapWindow = roundDuration;
  const maxReturnWindow = roundDuration * 3;
  const reservePriceWindow = roundDuration * 3;

  logger.debug("Calculation windows:", {
    roundDuration,
    twapWindow,
    maxReturnWindow,
    reservePriceWindow,
  });

  const fossilRequest = {
    identifiers: [identifier],
    params: {
      twap: [requestTimestamp - twapWindow, requestTimestamp],
      max_return: [requestTimestamp - maxReturnWindow, requestTimestamp],
      reserve_price: [requestTimestamp - reservePriceWindow, requestTimestamp],
    },
    client_info: {
      client_address: clientAddress,
      vault_address: vaultAddress,
      timestamp: requestTimestamp,
    },
  };

  logger.info("Sending request to Fossil API");
  logger.debug({ request: fossilRequest });

  try {
    const response = await axios.post(
      `${FOSSIL_API_URL}/pricing_data`,
      fossilRequest,
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": FOSSIL_API_KEY,
        },
      },
    );

    logger.info(
      "Fossil request sent. Response: " + JSON.stringify(response.data),
    );
    return response.data;
  } catch (error) {
    logger.error("Error sending Fossil request:", error);
    throw error;
  }
};
