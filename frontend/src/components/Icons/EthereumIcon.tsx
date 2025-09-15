const EthereumIcon = ({
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
      fill={fill}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3.33301 9.16712L9.99967 10.8337L16.6663 9.16699M3.33301 9.16712L9.99967 1.66699M3.33301 9.16712L9.99967 7.50039M16.6663 9.16699L9.99967 1.66699M16.6663 9.16699L9.99967 7.50039M9.99967 1.66699V7.50039M4.58301 12.5003L9.99978 18.3337L15.4163 12.5003L9.99967 13.7503L4.58301 12.5003Z"
        stroke="#8C8C8C"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default EthereumIcon;
