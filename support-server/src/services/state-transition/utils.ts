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

export const formatRawFossilRequest = (rawData: any): FossilRequest => {
  return {
    program_id: "0x" + rawData.program_id.toString(16),
    vault_address: "0x" + rawData.vault_address.toString(16),
    params: {
      twap: [Number(rawData.params.twap[0]), Number(rawData.params.twap[1])],
      max_return: [
        Number(rawData.params.max_return[0]),
        Number(rawData.params.max_return[1]),
      ],
      reserve_price: [
        Number(rawData.params.reserve_price[0]),
        Number(rawData.params.reserve_price[1]),
      ],
    },
  };
};

export const sendFossilRequest = async (
  fossilRequest: FossilRequest,
  //  clientAddress: string,
  vaultContract: Contract,
  logger: Logger,
) => {
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
