const WrongNetworkScreen = () => {
  return (
    <div className="wrong-network-modal-content flex flex-row items-center justify-center absolute top-0 left-0 right-0 bottom-0 z-10">
      <div className="flex flex-col items-center p-6 mb-4 bg-[#121212] border border-[#262626] rounded-lg max-w-[326px] m-5">
        <div className="bg-[#F5EBB8] rounded-full w-[48px] h-[48px] flex items-center justify-center mx-auto mb-6 border-[8px] border-[#524F44]">
          <span className="text-black text-2xl font-bold ">!</span>
        </div>

        <h2 className="text-center text-white text-[16px] my-[0.5rem]">
          Wrong network
        </h2>
        <p className="text-gray-400 text-center text-[14px]">
          Mainnet is not yet released. Please switch to a supported network
        </p>
      </div>
    </div>
  );
};

export default WrongNetworkScreen;
