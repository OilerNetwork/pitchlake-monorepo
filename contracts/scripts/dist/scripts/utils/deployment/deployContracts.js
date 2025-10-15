// deployContracts.js
import { CallData, CairoCustomEnum } from "starknet";
import vaultSierra from "../../../target/dev/pitch_lake_Vault.contract_class.json" assert { type: "json" };
import { constructorArgs } from "../constants";
async function deployEthContract(environment, account, classHash) {
    let constructorArgsEth = [...Object.values(constructorArgs[environment].eth)];
    const deployResult = await account.deploy({
        classHash,
        constructorCalldata: constructorArgsEth,
    });
    console.log("ETH contract is deployed successfully at - ", deployResult);
    return deployResult.contract_address[0];
}
async function deployVaultContract(environment, account, contractAddresses, hashes) {
    const contractCallData = new CallData(vaultSierra.abi);
    let constants = constructorArgs[environment].vault;
    const constructorCalldata = contractCallData.compile("constructor", {
        round_transition_period: constants.roundTransitionPeriod,
        auction_run_time: constants.auctionRunTime,
        option_run_time: constants.optionRunTime,
        eth_address: contractAddresses.ethContract,
        vault_type: new CairoCustomEnum({ AtTheMoney: {} }),
        fact_registry_address: contractAddresses.factRegistryContract,
        option_round_class_hash: hashes.optionRound,
    });
    const deployResult = await account.deploy({
        classHash: hashes.vault,
        constructorCalldata: constructorCalldata,
    });
    console.log("Vault contract is deployed successfully at - ", deployResult);
    return deployResult.contract_address[0];
}
async function deployFactRegistry(environment, account, factRegistryClassHash) {
    const deployResult = await account.deploy({
        classHash: factRegistryClassHash,
    });
    console.log("Market Aggregator contract is deployed successfully at - ", deployResult);
    return deployResult.contract_address[0];
}
async function deployContracts(environment, account, hashes) {
    let ethAddress = await deployEthContract(environment, account, hashes.ethHash);
    if (!ethAddress) {
        throw Error("Eth deploy failed");
    }
    let factRegistryAddress = await deployFactRegistry(environment, account, hashes.factRegistryHash);
    if (!factRegistryAddress) {
        throw Error("FactRegistry deploy failed");
    }
    let vaultAddress = await deployVaultContract(environment, account, {
        factRegistryContract: factRegistryAddress,
        ethContract: ethAddress,
    }, { optionRound: hashes.optionRoundHash, vault: hashes.vaultHash });
    if (!vaultAddress) {
        throw Error("Eth deploy failed");
    }
    return {
        ethAddress,
        factRegistryAddress,
        vaultAddress,
    };
}
export { deployEthContract, deployFactRegistry, deployVaultContract, deployContracts, };
