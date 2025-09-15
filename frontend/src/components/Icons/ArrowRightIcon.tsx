const ArrowRightIcon = ({
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
      width="13"
      height="12"
      viewBox="0 0 13 12"
      fill={fill}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0.75 6H11.25M11.25 6L6 11.25M11.25 6L6 0.75"
        stroke={stroke}
        strokeWidth   ="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default ArrowRightIcon;
