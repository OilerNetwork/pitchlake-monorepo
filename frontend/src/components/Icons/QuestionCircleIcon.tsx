const QuestionCircleIcon = ({
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
      width="18"
      height="18"
      viewBox="0 0 18 18"
      className={classname}
      fill={fill}
      stroke={stroke}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_1898_12582)">
        <path
          d="M6.8175 6.75C6.99383 6.24875 7.34186 5.82608 7.79997 5.55685C8.25807 5.28762 8.79667 5.1892 9.32038 5.27903C9.84409 5.36886 10.3191 5.64114 10.6613 6.04765C11.0035 6.45415 11.1908 6.96864 11.19 7.5C11.19 9 8.94 9.75 8.94 9.75M9 12.75H9.0075M16.5 9C16.5 13.1421 13.1421 16.5 9 16.5C4.85786 16.5 1.5 13.1421 1.5 9C1.5 4.85786 4.85786 1.5 9 1.5C13.1421 1.5 16.5 4.85786 16.5 9Z"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_1898_12582">
          <rect width="18" height="18" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};

export default QuestionCircleIcon;
