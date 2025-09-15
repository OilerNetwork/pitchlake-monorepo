import React from "react";
import { CopyIcon, LogOutIcon } from "lucide-react";
import Hoverable from "./Hoverable";
import { usePathname } from "next/navigation";

interface ProfileDropdownProps {
  account: {
    address: string;
  };
  balance: {
    wallet: string;
    locked: string;
    unlocked: string;
    stashed: string;
  };
  disconnect: () => void;
  copyToClipboard: (text: string) => void;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  account,
  balance,
  disconnect,
  copyToClipboard,
}) => {
  const pathName = usePathname();

  return (
    <div className="absolute right-0 mt-2 w-64 bg-black rounded-md shadow-lg py-1 border border-greyscale-800 max-h-[270px]">
      <Hoverable
        dataId="accountDropdownAddress"
        className="px-4 py-3 text-sm text-white border-b border-greyscale-800 flex justify-between items-center hover:cursor-pointer hover:bg-[#262626]"
        onClick={() => copyToClipboard(account.address)}
      >
        <span className="text-[var(--buttongrey)]">
          {account.address.slice(0, 6)}...{account.address.slice(-4)}
        </span>
        <CopyIcon className="h-4 w-4 text-[var(--buttongrey)] cursor-pointer" />
      </Hoverable>

      {
        //<div className="px-4 py-2 text-sm text-[var(--buttonwhite)] border-b border-greyscale-800">
        //  <Hoverable dataId="accountDropdownBalanceHeader">
        //    <h3 className="text-[var(--buttongrey)] mb-3 mt-2 text-[12px]">
        //      WALLET
        //    </h3>
        //  </Hoverable>
        //<div className="space-y-3">
        //       <Hoverable
        //         dataId="accountDropdownBalance"
        //         className="flex justify-between font-regular"
        //       >
        //         <span>ETH Balance</span>
        //         <span>{balance.wallet} ETH</span>
        //       </Hoverable>
        //    {pathName?.includes("vault") && (
        //      <>
        //        <Hoverable
        //          dataId="accountDropdownLocked"
        //          className="flex justify-between font-regular"
        //        >
        //          <span>Locked</span>
        //          <span>{balance.locked} ETH</span>
        //        </Hoverable>
        //        <Hoverable
        //          dataId="accountDropdownUnlocked"
        //          className="flex justify-between font-regular"
        //        >
        //          <span>Unlocked</span>
        //          <span>{balance.unlocked} ETH</span>
        //        </Hoverable>
        //        <Hoverable
        //          dataId="accountDropdownStashed"
        //          className="flex justify-between font-regular"
        //        >
        //          <span>Stashed</span>
        //          <span>{balance.stashed} ETH</span>
        //        </Hoverable>
        //      </>
        //    )}
        //</div>
        //</div>
      }

      <div
        className="px-4 py-3 text-sm text-white hover:bg-greyscale-800 cursor-pointer flex justify-between items-center font-regular"
        onClick={disconnect}
      >
        <span>Disconnect</span>
        <LogOutIcon className="h-4 w-4 text-[var(--buttongrey)]" />
      </div>
    </div>
  );
};

export default ProfileDropdown;
