const PieChartIcon = ({
  classname,
  stroke,
  fill,
}: {
  classname?: string;
  stroke?: string;
  fill?: string;
}) => {
  return (
    <svg
    className={classname}
      width="16"
      height="17"
      viewBox="0 0 16 17"
      fill={fill}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14.6663 8.5H11.9997L9.99967 14.5L5.99967 2.5L3.99967 8.5H1.33301"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default PieChartIcon;
