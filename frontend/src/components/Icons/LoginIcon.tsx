const LoginIcon = ({
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
      fill={fill}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        stroke={stroke}
        d="M3.5 11.75C3.5 12.4475 3.5 12.7962 3.57667 13.0823C3.78472 13.8588 4.3912 14.4653 5.16766 14.6733C5.45378 14.75 5.80252 14.75 6.5 14.75H11.15C12.4101 14.75 13.0402 14.75 13.5215 14.5048C13.9448 14.289 14.289 13.9448 14.5048 13.5215C14.75 13.0402 14.75 12.4101 14.75 11.15V4.85C14.75 3.58988 14.75 2.95982 14.5048 2.47852C14.289 2.05516 13.9448 1.71095 13.5215 1.49524C13.0402 1.25 12.4101 1.25 11.15 1.25H6.5C5.80252 1.25 5.45378 1.25 5.16766 1.32667C4.3912 1.53472 3.78472 2.1412 3.57667 2.91766C3.5 3.20378 3.5 3.55252 3.5 4.25M8 5L11 8M11 8L8 11M11 8H1.25"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default LoginIcon;
