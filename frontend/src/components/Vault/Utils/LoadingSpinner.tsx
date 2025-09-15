import React from "react";
// Remove or comment out the CSS import since it's not needed for tests
// The styles are likely already included in your app through other means
// import "@/app/globals.css";

const LoadingSpinner = () => {
  return (
    <>
      <div className="loading-container flex flex-col justify-center items-center h-full">
        <div className="spinner-wrapper w-[92px] h-[92px] rounded-2xl bg-[icon-gradient] border-[1px] border-greyscale-800 flex flex-row justify-center items-center mb-6">
          <div className="spinner w-[48px] h-[48px] rounded-full border-[8px] border-t-[#524F44] border-[#F5EBB8] flex items-center justify-center"></div>
        </div>
      </div>
    </>
  );
};

export default LoadingSpinner;
