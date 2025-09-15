import { RpcProvider } from "starknet";
import { setupLogger } from "../../shared/logger";
import { GasDataService } from "../confirmed-twaps/gasData";
import { StateTransitionService } from "../state-transition/stateTransitionService";
import { rpcToStarknetBlock } from "../../utils/rpcClient";


export const runTWAPUpdate = () => async () => {
  const service = new GasDataService();
  // if (isJobRunning) {
  //   console.log(
  //     `Previous job is still running at ${new Date().toISOString()}, skipping this run`
  //   );
  //   return;
  // }

  console.log(`\nRunning TWAP update job at ${new Date().toISOString()}`);
  // isJobRunning = true;

  try {
    const latestBlock = await service.updateTWAPs();
    console.log("Latest block:", latestBlock);
    console.log(`TWAP update job completed at ${new Date().toISOString()}, running state transition`);

    if(!latestBlock) {
      console.error("No latest block found");
      return;
    }

    const { STARKNET_RPC } = process.env;
    const provider = new RpcProvider({ nodeUrl: STARKNET_RPC });
    const latestBlockStarknet = await provider.getBlock('latest');
    if(!latestBlockStarknet) {
      console.error("No latest block found");
      return;
    }
    const latestBlockStarknetFormatted = rpcToStarknetBlock(latestBlockStarknet);
    const logger = setupLogger('State Transition');
    const stateTransitionService = new StateTransitionService(latestBlock, latestBlockStarknetFormatted, logger, provider);
    await stateTransitionService.runStateTransition();
  } catch (error) {
    console.error("Error in TWAP update job:", error);
  } finally {
    // isJobRunning = false;
  }
};
