import { FossilRequest } from "../../types/types";
import axios from "axios";
import { Contract, Account } from "starknet";
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

export const getJobStatus = async (jobId: string) => {
  try {
    const response = await axios.get(`${FOSSIL_API_URL}/job_status/${jobId}`, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": FOSSIL_API_KEY,
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      // Job not found - return a default status
      return { status: "not_found", job_id: jobId };
    }
    // Re-throw other errors
    throw error;
  }
};
export const sendFossilRequest = async (
  fossilRequest: FossilRequest,
  vaultContract: Contract,
  logger: Logger,
) => {
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

export const sendMockFossilRequest = async (
  fossilRequest: FossilRequest,
  vaultContract: Contract,
  logger: Logger,
  account?: Account,
) => {
  logger.info("Sending request to Mock Verifier");
  logger.debug({ request: fossilRequest });

  try {
    // Extract data from the original job request
    const { program_id, vault_address, params } = fossilRequest;

    // Get proving delay from vault
    const provingDelay = await vaultContract.get_proving_delay();

    // Calculate timestamp: upper bound + proving delay + tolerance
    // For now, using a tolerance of 60 seconds (can be made configurable later)
    const tolerance = 60; // seconds
    const timestamp =
      Number(params.reserve_price[1]) + Number(provingDelay) + tolerance;

    // Hardcoded values as specified
    const RESERVE_PRICE = "34028236692093846346337460743176821145600000000";
    const TWAP = "680564733841876926926749214863536422912000000000";
    const MAX_RETURN = "113416112894748789872342756657008344878";

    // Serialize job request: [vault_address, timestamp, program_id]
    const jobRequestSerialized = [
      vault_address, // vault address
      timestamp.toString(), // timestamp
      program_id, // program id
    ];

    // Serialize result: [reserve_price_lower, reserve_price_upper, reserve_price, twap_lower, twap_upper, twap, max_return_lower, max_return_upper, max_return]
    const resultSerialized = [
      params.reserve_price[0].toString(), // reserve price lower bound
      params.reserve_price[1].toString(), // reserve price upper bound
      RESERVE_PRICE, // reserve price
      params.twap[0].toString(), // twap lower bound
      params.twap[1].toString(), // twap upper bound
      TWAP, // twap
      params.max_return[0].toString(), // max return lower bound
      params.max_return[1].toString(), // max return upper bound
      MAX_RETURN, // max return
    ];

    // Get the automator's account address (which is acting as the mock verifier)
    const automatorAddress = account?.address;
    if (!automatorAddress) {
      throw new Error("No account provided for mock verifier");
    }

    logger.info("Calling fossil_callback directly on vault contract", {
      vaultAddress: vaultContract.address,
      automatorAddress: automatorAddress,
      jobRequest: jobRequestSerialized,
      result: resultSerialized,
    });

    // Call fossil_callback directly on the vault contract
    const { transaction_hash } = await vaultContract.fossil_callback(
      jobRequestSerialized,
      resultSerialized,
    );

    logger.info("Mock verifier callback sent successfully", {
      transactionHash: transaction_hash,
    });

    // Return a mock response similar to Fossil API
    const mockResponse = {
      job_id: `mock_job_${Date.now()}`,
      status: "completed", // Since we're calling directly, it's immediately completed
      verifier_address: automatorAddress,
      transaction_hash: transaction_hash,
    };

    logger.info(
      "Mock verifier request completed. Response: " +
        JSON.stringify(mockResponse),
    );
    return mockResponse;
  } catch (error) {
    logger.error("Error in mock verifier request:", error);
    throw error;
  }
};
