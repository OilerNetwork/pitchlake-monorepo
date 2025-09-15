import React, { ReactNode, useEffect, useMemo } from "react";
import { HammerIcon } from "@/components/Icons";
import ActionButton from "@/components/Vault/Utils/ActionButton";
import { useAccount } from "@starknet-react/core";
import { formatNumberText } from "@/lib/utils";
import { useTransactionContext } from "@/context/TransactionProvider";
import Hoverable from "@/components/BaseComponents/Hoverable";
import useVaultState from "@/hooks/vault_v2/states/useVaultState";
import useOBState from "@/hooks/vault_v2/states/useOBState";
import useVaultActions from "@/hooks/vault_v2/actions/useVaultActions";
import { useNewContext } from "@/context/NewProvider";
import useErc20Balance from "@/hooks/erc20/useErc20Balance";
import useRoundState from "@/hooks/vault_v2/states/useRoundState";

interface MintProps {
  showConfirmation: (
    modalHeader: string,
    action: ReactNode,
    onConfirm: () => Promise<void>,
  ) => void;
}

const Mint: React.FC<MintProps> = ({ showConfirmation }) => {
  const { conn } = useNewContext();
  const { selectedRoundAddress } = useVaultState();
  const vaultActions = useVaultActions();
  const obState = useOBState(selectedRoundAddress);
  const selectedRoundState = useRoundState(selectedRoundAddress);
  const { account } = useAccount();
  const { balance: optionERC20Balance } = useErc20Balance(
    selectedRoundState?.address as `0x${string}`,
  );
  const { pendingTx, setStatusModalProps, updateStatusModalProps } =
    useTransactionContext();

  const totalOptions = useMemo(() => {
    let total = BigInt(0);
    if (!obState) return total;

    // In RPC mode, we include the mintable option balance from the contrct getter (will be 0 post-mint)
    if (conn !== "ws") {
      if (optionERC20Balance) total += BigInt(optionERC20Balance);
      if (obState.mintableOptions) total += BigInt(obState?.mintableOptions);
    }
    // In WS mode, `mintableOptions` keeps the value of of the mintable options pre-mint, and uses a `hasMinted` flag
    else if (obState.hasMinted === false && obState.mintableOptions)
      total += BigInt(obState.mintableOptions);

    return total;
  }, [obState?.mintableOptions, obState?.hasMinted, optionERC20Balance]);

  const isButtonDisabled = useMemo(() => {
    if (!account) return true;
    if (pendingTx) return true;
    if (obState?.mintableOptions?.toString() === "0") return true;

    return false;
  }, [account, pendingTx, obState?.mintableOptions]);

  const handleMintOptions = async (): Promise<string> => {
    return (
      (await vaultActions?.mintOptions({
        roundAddress: selectedRoundAddress || "0x0",
      })) || ""
    );
  };

  const handleSubmit = () => {
    showConfirmation(
      "Mint",
      <>
        mint your
        <br />
        <span className="font-semibold text-[#fafafa]">
          {formatNumberText(Number(obState ? obState.mintableOptions : "0"))}
        </span>{" "}
        options
      </>,
      async () => {
        try {
          const hash = await handleMintOptions();
          setStatusModalProps({
            version: "success",
            txnHeader: "Mint Options Successful",
            txnHash: "",
            txnOutcome: (
              <>
                You have successfully minted{" "}
                <span className="font-semibold text-[#fafafa]">
                  {formatNumberText(
                    Number(obState ? obState.mintableOptions : "0"),
                  )}{" "}
                  options
                </span>
                .
              </>
            ),
          });
          console.log(3);
          updateStatusModalProps({
            txnHash: hash,
          });
          console.log(4);
        } catch (e) {
          setStatusModalProps({
            version: "failure",
            txnHeader: "Mint Options Failed",
            txnHash: "",
            txnOutcome: (
              <>
                Failed to mint{" "}
                <span className="font-semibold text-[#fafafa]">
                  {formatNumberText(
                    Number(obState ? obState.mintableOptions : "0"),
                  )}{" "}
                  options
                </span>{" "}
                .
              </>
            ),
          });
          console.error("Error minting options: ", e);
        }
      },
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col flex-grow space-y-6 items-center justify-center">
        <HammerIcon classname="mint-icon w-[90px] h-[90px] rounded-2xl bg-icon-gradient border-[1px] border-greyscale-800 flex flex-row justify-center items-center" />
        <p className="max-w-[290px] text-[#bfbfbf] text-center font-regular text-[14px]">
          Your mintable option balance is
          <br />
          <span className="font-regular text-[14px] font-semibold text-[#fafafa]">
            {formatNumberText(
              Number(obState?.mintableOptions?.toString() ?? "0"),
            )}
          </span>
        </p>
      </div>
      <Hoverable
        dataId="lpActionTotalOptionsBalance"
        className="px-6 flex justify-between text-sm mb-6 pt-6"
      >
        <span className="text-gray-400">Total Options</span>
        <span className="text-white">
          {formatNumberText(Number(totalOptions.toString()))}
        </span>
      </Hoverable>

      <div className="mt-auto">
        <div className="px-6 flex justify-between text-sm mb-6 pt-6 border-t border-[#262626]">
          <ActionButton
            onClick={handleSubmit}
            disabled={isButtonDisabled}
            text="Mint Now"
            dataId="mintButton"
          />
        </div>
      </div>
    </div>
  );
};

export default Mint;
