const ArrowDownIcon = ({
  classname,
  stroke,
  fill,
  strokeWidth = "1.5",
}: {
  classname?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: string;
}) => {
  return (
    <svg
      className={classname}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill={fill}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 6L8 10L12 6"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default ArrowDownIcon;
