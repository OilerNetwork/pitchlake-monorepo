const GlobeIcon = ({
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
      fill={fill}
      className={classname}
      stroke={stroke}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1.66602 10.0003H18.3327M1.66602 10.0003C1.66602 14.6027 5.39698 18.3337 9.99935 18.3337M1.66602 10.0003C1.66602 5.39795 5.39698 1.66699 9.99935 1.66699M18.3327 10.0003C18.3327 14.6027 14.6017 18.3337 9.99935 18.3337M18.3327 10.0003C18.3327 5.39795 14.6017 1.66699 9.99935 1.66699M9.99935 1.66699C12.0837 3.94895 13.2683 6.91035 13.3327 10.0003C13.2683 13.0903 12.0837 16.0517 9.99935 18.3337M9.99935 1.66699C7.91495 3.94895 6.73039 6.91035 6.66602 10.0003C6.73039 13.0903 7.91495 16.0517 9.99935 18.3337"
        stroke="#BFBFBF"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default GlobeIcon;
