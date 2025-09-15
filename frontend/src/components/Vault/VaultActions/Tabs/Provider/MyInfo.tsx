import React from "react";
import { Clock } from "lucide-react";
import { ArrowUp, ArrowDown } from "lucide-react";

const plPercentage = (startingBalance: number, endingBalance: number) => {
  const percentage =
    ((endingBalance - startingBalance) / startingBalance) * 100;

  return Number(percentage.toFixed(2));
};

// replace with real data

const data = {
  startingBalance: 10.5,
  premiumsReceived: 4.3,
  payoutsLost: 2.1,
};

const InfoItem: React.FC<{
  label: string;
  value: string;
  isPending: boolean;
  plPercentage?: string;
}> = ({ label, value, isPending, plPercentage }) => (
  <div className="vault-info-item">
    <p className="vault-info-label text-regular text-[var(--buttongrey)] text-[14px]">{label}</p>
    <p className="vault-info-value flex flex-row items-center text-medium text-[14px] mt-2 text-base font-medium">
      {isPending && <Clock size={14} />}
      &nbsp;
      {value}
      {plPercentage && (
        <span
          className={`vault-info-percentage ml-2 ${styles.bg} ${styles.text} font-medium rounded-full px-2 py-[1px] flex flex-row items-center text-[14px]`}
        >
          {Math.abs(Number(plPercentage))}%&nbsp;
          {Number(plPercentage) > 0 ? (
            <ArrowUp size={14} />
          ) : (
            <ArrowDown size={14} />
          )}
        </span>
      )}
    </p>
  </div>
);

const stateStyles: any = {
  Positive: {
    bg: "bg-[#214C0B80]",
    text: "text-[#6AB942]",
    icon: "#6AB942",
  },
  Negative: {
    bg: "bg-[#CC455E33]",
    text: "text-[#DA718C]",
    icon: "#DA718C",
  },
};

const endingBalance = Number(
  Number(
    data.startingBalance + data.premiumsReceived - data.payoutsLost,
  ).toFixed(2),
);
const gain = Number((endingBalance - data.startingBalance).toFixed(2));
const performance = plPercentage(data.startingBalance, endingBalance);
const styles =
  stateStyles[performance > 0 ? "Positive" : "Negative"] ||
  stateStyles.Negative;

// Needs to use selected round state and render conditionally,
// - if open, all are pending
// - if auctioning, starting balance is known
// - if running, premiums received is known
// - if settled, the rest is known
const MyInfo: React.FC = () => (
  <div className="vault-provider-info text-white p rounded-lg">
    <div className="vault-provider-info-content space-y-4 p-6">
      <InfoItem
        label="My P&L"
        value={`${performance > 0 ? "+" : "-"}${gain} ETH`}
        isPending={false}
        plPercentage={performance.toString()}
      />
      <InfoItem
        label="Starting Balance"
        value={`${data.startingBalance} ETH`}
        isPending={false}
      />
      <InfoItem
        label="Ending Balance"
        value={`${endingBalance} ETH`}
        isPending={false}
      />
      <InfoItem
        label="Premiums Received"
        value={`${data.premiumsReceived} ETH`}
        isPending={false}
      />
      <InfoItem
        label="Payouts Lost"
        value={`${data.payoutsLost} ETH`}
        isPending={true}
      />
    </div>
  </div>
);

export default MyInfo;

