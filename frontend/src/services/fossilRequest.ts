import { Account, Contract, Provider } from "starknet";
import { vaultABI } from "@/lib/abi";
import { FossilRequest } from "@/lib/types";

// Helper function for mock verifier (testing only)
const sendMockFossilRequest = async (
  jobRequest: FossilRequest,
  vaultAddress: string,
): Promise<string> => {
  const OK = "Ok";
  const NOT_OK = "Not Ok";
  
  try {
    // Get demo account setup (same as sendMockFossilCallback route)
    const address = process.env.DEMO_ACCOUNT_ADDRESS;
    const pk = process.env.DEMO_PRIVATE_KEY;
    const rpc = process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA;

    if (!address || !pk || !rpc) {
      console.error("Failed to fetch demo account secrets");
      return NOT_OK;
    }

    // Initialize demo account
    const provider = new Provider({ nodeUrl: rpc });
    const account = new Account(provider, address, pk);

    // Initialize vault contract with demo account
    const vaultContract = new Contract(vaultABI, vaultAddress as string, account);
    
    // Hardcoded values as specified in support-server utils.ts
    const RESERVE_PRICE = "34028236692093846346337460743176821145600000000";
    const TWAP = "680564733841876926926749214863536422912000000000";
    const MAX_RETURN = "113416112894748789872342756657008344878";
    
    // Get proving delay from vault
    const provingDelay = await vaultContract.get_proving_delay();
    
    // Calculate timestamp: upper bound + proving delay + tolerance
    const tolerance = 60; // seconds
    const timestamp = Number(jobRequest.params.reserve_price[1]) + Number(provingDelay) + tolerance;
    
    // Serialize job request: [vault_address, timestamp, program_id]
    const jobRequestSerialized = [
      jobRequest.vault_address,
      timestamp.toString(),
      jobRequest.program_id,
    ];
    
    // Serialize result: [reserve_price_lower, reserve_price_upper, reserve_price, twap_lower, twap_upper, twap, max_return_lower, max_return_upper, max_return]
    const resultSerialized = [
      jobRequest.params.reserve_price[0].toString(), // reserve price lower bound
      jobRequest.params.reserve_price[1].toString(), // reserve price upper bound
      RESERVE_PRICE, // reserve price
      jobRequest.params.twap[0].toString(), // twap lower bound
      jobRequest.params.twap[1].toString(), // twap upper bound
      TWAP, // twap
      jobRequest.params.max_return[0].toString(), // max return lower bound
      jobRequest.params.max_return[1].toString(), // max return upper bound
      MAX_RETURN, // max return
    ];
    
    // Call fossil_callback directly on the vault contract
    const { transaction_hash } = await vaultContract.fossil_callback(
      jobRequestSerialized,
      resultSerialized,
    );
    
    console.log("Mock verifier callback sent successfully", {
      transactionHash: transaction_hash,
    });
    
    return OK;
  } catch (error) {
    console.error("Error in mock verifier request:", error);
    return NOT_OK;
  }
};

export const sendFossilRequest = async (
  jobRequest: FossilRequest | null,
  conn: string,
  vaultAddress: string,
): Promise<string> => {
  const OK = "Ok";
  const NOT_OK = "Not Ok";
  if (!jobRequest) return NOT_OK;
  
  if (conn === "demo") {
    return await sendMockFossilRequest(jobRequest, vaultAddress);
  } else if (conn === "ws" || conn === "rpc") {
    const formattedRequest = {
      program_id: "0x" + jobRequest.program_id.toString(16),
      vault_address: "0x" + jobRequest.vault_address.toString(16),
      params: {
        twap: [
          Number(jobRequest.params.twap[0]),
          Number(jobRequest.params.twap[1]),
        ],
        max_return: [
          Number(jobRequest.params.max_return[0]),
          Number(jobRequest.params.max_return[1]),
        ],
        reserve_price: [
          Number(jobRequest.params.reserve_price[0]),
          Number(jobRequest.params.reserve_price[1]),
        ],
      },
    };

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}sendJobRequest`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fossil_request: formattedRequest,
          round_id: 1, // You may need to pass the actual round ID
        }),
      },
    );

    if (response.ok) return OK;
    return NOT_OK;
  }
  return OK;
};
