"use client";
import {
  Dispatch,
  ReactNode,
  SetStateAction,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { useWaitForTransaction } from "@starknet-react/core";
import { StatusModalProps } from "@/lib/types";

/*This is the bridge for any transactions to go through, it's disabled by isTxDisabled if there is data loading or if
  there's a pending transaction. The data loading is enforced to ensure no transaction is done without latest data.
  Add pendingStates from any critical data here and add it in the subsequent hooks
*/
//Possible Updates:
//Make transactions accepted only after 2 confirmations

export type ModalStateProps = {
  show: boolean;
  type: "confirmation" | "pending" | "success" | "failure";
  modalHeader: string;
  action: ReactNode;
  onConfirm: () => Promise<void>;
};
export type TransactionContextType = {
  isTxDisabled: boolean;
  pendingTx: string | undefined;
  setIsTxDisabled: Dispatch<SetStateAction<boolean>>;
  setPendingTx: Dispatch<SetStateAction<string | undefined>>;
  status: "error" | "success" | "pending";
  statusModalProps: StatusModalProps;
  setStatusModalProps: Dispatch<SetStateAction<StatusModalProps>>;
  updateStatusModalProps: (updates: Partial<StatusModalProps>) => void;
  modalState: ModalStateProps;
  setModalState: Dispatch<SetStateAction<ModalStateProps>>;
};

export const TransactionContext = createContext<TransactionContextType>(
  {} as TransactionContextType,
);
const TransactionProvider = ({ children }: { children: ReactNode }) => {
  const [isTxDisabled, setIsTxDisabled] = useState<boolean>(false);
  const [pendingTx, setPendingTx] = useState<string | undefined>();
  const { status } = useWaitForTransaction({ hash: pendingTx });

  const [statusModalProps, setStatusModalProps] = useState<StatusModalProps>({
    version: null,
    txnHeader: "",
    txnHash: "",
    txnOutcome: "",
  });

  const [modalState, setModalState] = useState<{
    show: boolean;
    type: "confirmation" | "pending" | "success" | "failure";
    modalHeader: string;
    action: ReactNode;
    onConfirm: () => Promise<void>;
  }>({
    show: false,
    type: "confirmation",
    modalHeader: "",
    action: "",
    onConfirm: async () => {},
  });

  const updateStatusModalProps = (updates: Partial<StatusModalProps>) => {
    setStatusModalProps((prevState) => ({ ...prevState, ...updates }));
  };

  const resetState = () => {
    setPendingTx(undefined);
    setIsTxDisabled(false);
  };
  const clearTransaction = async () => {
    resetState();
  };

  useEffect(() => {
    if (pendingTx)
      switch (status) {
        case "pending":
          break;
        case "success":
          clearTransaction();
          break;
        case "error":
          clearTransaction();
          break;
        default:
      }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTx, status]);

  useEffect(() => {
    setIsTxDisabled(!!pendingTx);
  }, [pendingTx]);

  return (
    <TransactionContext.Provider
      value={{
        isTxDisabled,
        pendingTx,
        setIsTxDisabled,
        setPendingTx,
        status,
        statusModalProps,
        setStatusModalProps,
        updateStatusModalProps,
        modalState,
        setModalState,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};

export const useTransactionContext = () => useContext(TransactionContext);

export default TransactionProvider;
