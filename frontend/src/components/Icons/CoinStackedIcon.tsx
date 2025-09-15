const CoinStackedIcon = ({
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
      width="17"
      height="16"
      viewBox="0 0 17 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13.8327 3.33301C13.8327 4.43758 11.4449 5.33301 8.49935 5.33301C5.55383 5.33301 3.16602 4.43758 3.16602 3.33301M13.8327 3.33301C13.8327 2.22844 11.4449 1.33301 8.49935 1.33301C5.55383 1.33301 3.16602 2.22844 3.16602 3.33301M13.8327 3.33301V12.6663C13.8327 13.7709 11.4449 14.6663 8.49935 14.6663C5.55383 14.6663 3.16602 13.7709 3.16602 12.6663V3.33301M13.8327 6.44407C13.8327 7.54864 11.4449 8.44407 8.49935 8.44407C5.55383 8.44407 3.16602 7.54864 3.16602 6.44407M13.8327 9.55301C13.8327 10.6576 11.4449 11.553 8.49935 11.553C5.55383 11.553 3.16602 10.6576 3.16602 9.55301"
        stroke={stroke}
        fill={fill}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default CoinStackedIcon;
