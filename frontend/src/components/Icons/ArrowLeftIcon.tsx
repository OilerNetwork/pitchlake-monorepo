const ArrowLeftIcon = ({
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

        d="M12.25 6H1.75M1.75 6L7 11.25M1.75 6L7 0.75"
        stroke={stroke}
        strokeWidth ="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default ArrowLeftIcon;
