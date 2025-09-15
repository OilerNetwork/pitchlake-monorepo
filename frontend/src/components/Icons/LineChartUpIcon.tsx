const LineChartUpIcon = ({
  classname,
  stroke,
  fill,
}: {
  classname?: string;
  stroke?: string;
  fill?: string;
}) => {
  return (
    <svg className={classname} fill={fill}>
      <path
        d="M14.25 14.75H1.95C1.52996 14.75 1.31994 14.75 1.15951 14.6683C1.01839 14.5964 0.90365 14.4816 0.831745 14.3405C0.75 14.1801 0.75 13.97 0.75 13.55V1.25M14.25 4.25L10.1743 8.32574C10.0258 8.47424 9.9515 8.5485 9.86588 8.57632C9.79057 8.60079 9.70943 8.60079 9.63412 8.57632C9.5485 8.5485 9.47424 8.47424 9.32574 8.32574L7.92426 6.92426C7.77576 6.77576 7.7015 6.7015 7.61588 6.67368C7.54057 6.64921 7.45943 6.64921 7.38412 6.67368C7.2985 6.7015 7.22424 6.77576 7.07574 6.92426L3.75 10.25M14.25 4.25H11.25M14.25 4.25V7.25"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default LineChartUpIcon;
