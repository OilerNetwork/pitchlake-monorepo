const MobileScreen = () => {
  return (
    <div className="flex flex-row items-center justify-center absolute top-0 left-0 right-0 bottom-0">
      <div className="flex flex-col items-center p-6 mb-4 bg-[#121212] border border-[#262626] rounded-lg max-w-[326px] m-5">
        <div className="bg-[#F5EBB8] rounded-full w-[48px] h-[48px] flex items-center justify-center mx-auto mb-6 border-[8px] border-[#524F44]">
          <span className="text-black text-2xl font-bold ">!</span>
        </div>

        <h2 className="text-center text-white text-[16px] my-[0.5rem]">
          Device Not Supported
        </h2>
        <p className="text-gray-400 text-center text-[14px]">
          Please use a desktop or laptop to access Pitchlake.
        </p>
      </div>
    </div>
  );
};
export default MobileScreen;
