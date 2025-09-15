const SpeedometerIcon = ({
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
      height="15"
      viewBox="0 0 16 15"
      fill={fill}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3.33301 7.50065C3.33301 4.92332 5.42235 2.83398 7.99967 2.83398M10.9996 4.50065L7.99961 7.50065M14.6663 7.50065C14.6663 11.1826 11.6816 14.1673 7.99967 14.1673C4.31778 14.1673 1.33301 11.1826 1.33301 7.50065C1.33301 3.81875 4.31778 0.833984 7.99967 0.833984C11.6816 0.833984 14.6663 3.81875 14.6663 7.50065ZM8.66634 7.50065C8.66634 7.86884 8.36786 8.16732 7.99967 8.16732C7.63148 8.16732 7.33301 7.86884 7.33301 7.50065C7.33301 7.13246 7.63148 6.83398 7.99967 6.83398C8.36786 6.83398 8.66634 7.13246 8.66634 7.50065Z"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default SpeedometerIcon;
