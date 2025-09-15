const LayoutLeftIcon = ({
  classname,
  stroke,
  fill,
}: {
  classname?: string;
  fill?: string;
  stroke?: string;
}) => {
  return (
    <svg
    className={classname}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.5 0.5V15.5M4.5 0.5H11.5C12.9001 0.5 13.6002 0.5 14.135 0.772484C14.6054 1.01217 14.9878 1.39462 15.2275 1.86502C15.5 2.3998 15.5 3.09987 15.5 4.5V11.5C15.5 12.9001 15.5 13.6002 15.2275 14.135C14.9878 14.6054 14.6054 14.9878 14.135 15.2275C13.6002 15.5 12.9001 15.5 11.5 15.5H4.5C3.09987 15.5 2.3998 15.5 1.86502 15.2275C1.39462 14.9878 1.01217 14.6054 0.772484 14.135C0.5 13.6002 0.5 12.9001 0.5 11.5V4.5C0.5 3.09987 0.5 2.3998 0.772484 1.86502C1.01217 1.39462 1.39462 1.01217 1.86502 0.772484C2.3998 0.5 3.09987 0.5 4.5 0.5Z"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default LayoutLeftIcon;
