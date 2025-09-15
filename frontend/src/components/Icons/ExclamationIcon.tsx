const ExlamationIcon = ({
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
      className={classname}
    >
      <rect
        x="0.5"
        y="1.00195"
        width="93"
        height="93"
        rx="15.5"
        fill="url(#paint0_radial_1239_94805)"
        stroke="#262626"
      />
      <g clipPath="url(#clip0_1239_94805)">
        <path
          d="M47.0299 72.0598C60.3012 72.0598 71.0598 61.3012 71.0598 48.0299C71.0598 34.7585 60.3012 24 47.0299 24C33.7585 24 23 34.7585 23 48.0299C23 61.3012 33.7585 72.0598 47.0299 72.0598Z"
          fill="#524F44"
        />
        <path
          d="M47.0304 65.6642C56.7693 65.6642 64.6642 57.7693 64.6642 48.0304C64.6642 38.2914 56.7693 30.3965 47.0304 30.3965C37.2914 30.3965 29.3965 38.2914 29.3965 48.0304C29.3965 57.7693 37.2914 65.6642 47.0304 65.6642Z"
          fill="#F3E7A9"
        />
        <path
          d="M44.459 37.6885H49.5399V51.3174H44.459V37.6885Z"
          fill="#131313"
        />
        <path
          d="M47.0296 58.3112C48.6473 58.3112 49.9586 56.9998 49.9586 55.3821C49.9586 53.7645 48.6473 52.4531 47.0296 52.4531C45.412 52.4531 44.1006 53.7645 44.1006 55.3821C44.1006 56.9998 45.412 58.3112 47.0296 58.3112Z"
          fill="#131313"
        />
      </g>
      <defs>
        <radialGradient
          id="paint0_radial_1239_94805"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(47 47.502) rotate(90) scale(47)"
        >
          <stop stopColor="#030303" />
          <stop offset="1" stopColor="#171717" />
        </radialGradient>
        <clipPath id="clip0_1239_94805">
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

export default ExlamationIcon;
