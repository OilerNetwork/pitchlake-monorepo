const LineChartDownIcon = ({
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
      width="15"
      height="16"
      viewBox="0 0 15 16"
      fill={fill}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14.25 14.75H1.95C1.52996 14.75 1.31994 14.75 1.15951 14.6683C1.01839 14.5964 0.90365 14.4816 0.831745 14.3405C0.75 14.1801 0.75 13.97 0.75 13.55V1.25M14.25 10.25L10.1743 6.17426C10.0258 6.02576 9.9515 5.9515 9.86588 5.92368C9.79057 5.89921 9.70943 5.89921 9.63412 5.92368C9.5485 5.9515 9.47424 6.02576 9.32574 6.17426L7.92426 7.57574C7.77576 7.72424 7.7015 7.7985 7.61588 7.82632C7.54057 7.85079 7.45943 7.85079 7.38412 7.82632C7.2985 7.7985 7.22424 7.72424 7.07574 7.57574L3.75 4.25M14.25 10.25H11.25M14.25 10.25V7.25"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default LineChartDownIcon;
