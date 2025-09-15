const TxSuccessIcon = ({
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
      width="94"
      height="95"
      viewBox="0 0 94 95"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="0.5"
        y="1.00195"
        width="93"
        height="93"
        rx="15.5"
        fill="url(#paint0_radial_1232_76435)"
        stroke="#262626"
      />
      <g clipPath="url(#clip0_1232_76435)">
        <path
          d="M47.0299 72.0598C60.3012 72.0598 71.0598 61.3012 71.0598 48.0299C71.0598 34.7585 60.3012 24 47.0299 24C33.7585 24 23 34.7585 23 48.0299C23 61.3012 33.7585 72.0598 47.0299 72.0598Z"
          fill="#524F44"
        />
        <path
          d="M47.0299 65.6642C56.7688 65.6642 64.6637 57.7693 64.6637 48.0304C64.6637 38.2914 56.7688 30.3965 47.0299 30.3965C37.2909 30.3965 29.396 38.2914 29.396 48.0304C29.396 57.7693 37.2909 65.6642 47.0299 65.6642Z"
          fill="#F3E7A9"
        />
        <path
          d="M39.2198 47.9585L43.2926 52.0167L54.781 40.5283L56.9998 42.7472L43.2926 56.469L37.001 50.1774L39.2198 47.9585Z"
          fill="#121212"
        />
      </g>
      <defs>
        <radialGradient
          id="paint0_radial_1232_76435"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(47 47.502) rotate(90) scale(47)"
        >
          <stop stopColor="#030303" />
          <stop offset="1" stopColor="#171717" />
        </radialGradient>
        <clipPath id="clip0_1232_76435">
          <rect
            width="48"
            height="48"
            fill="white"
            transform="translate(23 24)"
          />
        </clipPath>
      </defs>
    </svg>
  );
};

export default TxSuccessIcon;
