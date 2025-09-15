import React, { useState, ReactNode, useMemo, useEffect } from "react";
import { useTransactionContext } from "@/context/TransactionProvider";
import { parseEther, formatEther } from "ethers";
import InputField from "@/components/Vault/Utils/InputField";
import ActionButton from "@/components/Vault/Utils/ActionButton";
import ButtonTabs from "../ButtonTabs";
import { EthereumIcon, PersonIcon } from "@/components/Icons";
import { useAccount } from "@starknet-react/core";
import useErc20Balance from "@/hooks/erc20/useErc20Balance";
import useErc20Allowance from "@/hooks/erc20/useErc20Allowance";
import { shortenString, isValidHex64, formatNumber } from "@/lib/utils";
import Hoverable from "@/components/BaseComponents/Hoverable";
import useVaultState from "@/hooks/vault_v2/states/useVaultState";
import useLPState from "@/hooks/vault_v2/states/useLPState";
import useDepositMulticall from "@/hooks/txn/useDepositMulticall";

const DEPOSIT_AMOUNT_KEY = "depositAmount";
const DEPOSIT_BENEFICIARY_KEY = "depositBeneficiary";

interface DepositProps {
  showConfirmation: (
    modalHeader: string,
    action: ReactNode,
    onConfirm: () => Promise<void>,
  ) => void;
}

interface DepositState {
  amount: string;
  isDepositAsBeneficiary: boolean;
  beneficiaryAddress: string;
  activeWithdrawTab: "For Me" | "For Someone Else";
}

const Deposit: React.FC<DepositProps> = ({ showConfirmation }) => {
  const { account } = useAccount();
  const { vaultState } = useVaultState();
  const { pendingTx, setStatusModalProps, setModalState } =
    useTransactionContext();
  const { balance } = useErc20Balance(vaultState?.ethAddress as `0x${string}`);
  const { allowance } = useErc20Allowance(
    vaultState?.ethAddress as `0x${string}`,
    vaultState?.address,
  );
  const lpState = useLPState();

  const [state, setState] = useState<DepositState>({
    amount: "",
    isDepositAsBeneficiary: false,
    beneficiaryAddress: "",
    activeWithdrawTab: "For Me",
  });

  const updateState = (updates: Partial<DepositState>) => {
    setState((prevState) => ({ ...prevState, ...updates }));
  };

  // Amount input error msg
  const amountReason: string = useMemo(() => {
    if (!account) return "Connect account";
    else if (state.amount == "") {
      return "";
    } else if (Number(state.amount) <= 0)
      return "Amount must be greater than 0";
    else if (parseEther(state.amount) > balance)
      return `Exceeds balance (${parseFloat(formatEther(balance.toString())).toFixed(5)} ETH)`;
    else return "";
  }, [state.amount, balance, account]);

  // Beneficiary input error msg
  const beneficiaryReason: string = useMemo(() => {
    if (!account) return "Connect account";
    else if (state.isDepositAsBeneficiary) {
      const lookup = ["", "0", "0x"];

      if (lookup.includes(state.beneficiaryAddress)) return "";
      else if (!isValidHex64(state.beneficiaryAddress))
        return "Invalid address";
      return "";
    }
    return "";
  }, [account, state.beneficiaryAddress, state.isDepositAsBeneficiary]);

  // Disable button if any error msg
  const isButtonDisabled = useMemo(() => {
    if (pendingTx) return true;
    if (amountReason !== "" || beneficiaryReason !== "") return true;
    if (state.amount === "") return true;
    return false;
  }, [pendingTx, amountReason, beneficiaryReason, state.amount]);

  const { handleMulticall } = useDepositMulticall({
    accountAddress: account?.address,
    vaultAddress: vaultState?.address,
    ethAddress: vaultState?.ethAddress,
    allowance: allowance,
    depositAmount: state.amount,
    isDepositAsBeneficiary: state.isDepositAsBeneficiary,
    beneficiaryAddress: state.beneficiaryAddress,
    localStorageToRemove: [DEPOSIT_AMOUNT_KEY, DEPOSIT_BENEFICIARY_KEY],
  });

  // Send confirmation
  const handleSubmitForMulticall = () => {
    showConfirmation(
      "Deposit",
      <>
        <br />
        deposit{" "}
        <span className="font-semibold text-[#fafafa]">
          {formatNumber(Number(state.amount))} ETH
        </span>
        {state.isDepositAsBeneficiary && (
          <>
            <br />
            for{" "}
            <span className="font-semibold text-[#fafafa]">
              {shortenString(state.beneficiaryAddress)}
            </span>
          </>
        )}
      </>,
      async () => {
        try {
          const hash = await handleMulticall();

          setStatusModalProps({
            version: "success",
            txnHeader: "Deposit Successful",
            txnHash: hash,
            txnOutcome: (
              <>
                You have successfully deposited{" "}
                <span className="font-semibold text-[#fafafa]">
                  {formatNumber(Number(state.amount))} ETH
                </span>{" "}
                to{" "}
                {state.isDepositAsBeneficiary ? (
                  <span className="font-semibold text-[#fafafa]">
                    {state.beneficiaryAddress?.slice(0, 6)}...
                    {state.beneficiaryAddress?.slice(-4)}&apos;s
                  </span>
                ) : (
                  "your"
                )}{" "}
                unlocked balance.
              </>
            ),
          });
          setState((prevState) => ({ ...prevState, amount: "" }));
        } catch (e) {
          setStatusModalProps({
            version: "failure",
            txnHeader: "Deposit Failed",
            txnHash: "",
            txnOutcome: (
              <>
                Your deposit of{" "}
                <span className="font-semibold text-[#fafafa]">
                  {formatNumber(Number(state.amount))} ETH
                </span>{" "}
                failed.
              </>
            ),
          });
          console.error("Error sending deposit txn: ", e);
        }
      },
    );
  };

  // Load from local storage on mount
  useEffect(() => {
    const amount = localStorage.getItem(DEPOSIT_AMOUNT_KEY);
    const beneficiaryAddress = localStorage.getItem(DEPOSIT_BENEFICIARY_KEY);
    if (amount || beneficiaryAddress) {
      setState((prevState) => ({
        ...prevState,
        amount: amount || "",
        beneficiaryAddress: beneficiaryAddress || "",
      }));
    }
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow space-y-6 p-6">
        <ButtonTabs
          tabs={["For Me", "For Someone Else"]}
          activeTab={state.activeWithdrawTab}
          setActiveTab={(tab) =>
            updateState({
              activeWithdrawTab: tab as "For Me" | "For Someone Else",
              isDepositAsBeneficiary: tab === "For Someone Else",
            })
          }
        />
        {state.isDepositAsBeneficiary && (
          <div>
            <InputField
              type="text"
              value={state.beneficiaryAddress}
              label="Enter Address"
              dataId="inputDepositAddress"
              onChange={(e) => {
                updateState({ beneficiaryAddress: e.target.value });
                localStorage.setItem(DEPOSIT_BENEFICIARY_KEY, e.target.value);
              }}
              placeholder="Depositor's Address"
              icon={
                <PersonIcon classname="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
              }
              error={beneficiaryReason}
            />
          </div>
        )}
        <div>
          <InputField
            type="number"
            value={state.amount}
            label="Enter Amount"
            dataId="inputDepositAmount"
            onChange={(e) => {
              updateState({
                amount: e.target.value.slice(
                  0,
                  e.target.value.indexOf(".") + 19,
                ),
              });
              localStorage.setItem(DEPOSIT_AMOUNT_KEY, e.target.value);
            }}
            placeholder="e.g. 5.0"
            error={amountReason}
            icon={
              <EthereumIcon classname="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
            }
          />
        </div>
      </div>

      <div className="mt-auto">
        {state.activeWithdrawTab === "For Me" && (
          <Hoverable
            dataId="lpActionUnlockedBalance"
            className="px-6 flex justify-between text-sm mb-6 pt-6"
          >
            <span className="text-gray-400">Unlocked Balance</span>
            <span className="text-white">
              {formatNumber(
                parseFloat(
                  formatEther(
                    BigInt(lpState?.unlockedBalance?.toString() || "0"),
                  ),
                ),
              )}{" "}
              ETH
            </span>
          </Hoverable>
        )}
        <div className="px-6 flex justify-between text-sm mb-6 pt-6 border-t border-[#262626]">
          <ActionButton
            onClick={handleSubmitForMulticall}
            disabled={isButtonDisabled}
            text={pendingTx ? "Pending" : "Deposit"}
            dataId="depositButton"
          />
        </div>
      </div>
    </div>
  );
};

export default Deposit;
