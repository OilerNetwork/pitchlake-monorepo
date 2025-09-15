import React, { ReactNode, useEffect } from "react";
import { HoverIcon, QuestionCircleIcon } from "../Icons";
import { XIcon } from "lucide-react";
import { useHelpContext } from "@/context/HelpProvider";

export const HelpBoxPanel = () => {
  const {
    isHelpBoxOpen,
    toggleHelpBoxOpen,
    content,
    header,
    setActiveDataId,
    setIsHoveringHelpBox,
  } = useHelpContext();

  const handleMouseEnter = () => setIsHoveringHelpBox(true);
  const handleMouseLeave = () => setIsHoveringHelpBox(false);

  useEffect(() => {
    // If we just opened the help box
    if (isHelpBoxOpen) {
      setActiveDataId(null);
    }
  }, [isHelpBoxOpen, setActiveDataId]);

  return (
    <>
      <div
        className="bg-[#121212] h-[307px] border border-[#262626] rounded-lg"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex justify-between items-center px-6 py-4">
          <h2 className="font-medium text-sm text-[#fafafa]">
            {header ? header : "Help"}
          </h2>
          <div className="" onClick={toggleHelpBoxOpen}>
            <XIcon className="w-4 h-4 cursor-pointer" stroke="#bfbfbf" />
          </div>
        </div>
        <div className="border-t border-[#262626] w-full h-[1px]"></div>

        <div className="h-[183px]">
          {content ? <HelpText content={content} /> : <Default />}
        </div>

        <div className="mt-auto flex flex-row items-center px-4 border-t border-[#262626] p-4">
          <div className="w-[18px] h-[18px] mr-2">
            <QuestionCircleIcon stroke="#8C8C8C" fill="none" />
          </div>
          <p className="text-[12px] text-[#8C8C8C] font-medium max-w-[276px]">
            Text will update after a second. Move back to this window to keep
            the current text visible.
          </p>
        </div>
      </div>
    </>
  );
};

export const HelpText = ({ content }: { content: ReactNode }) => {
  return (
    <div className="w-full h-full p-4">
      <div className="mb-auto h-full max-h-[151px] w-[302px] flex flex-col overflow-hidden bg-[#0A0A0A] rounded-lg border-[1px] border-[#262626]">
        <p className="custom-scrollbar p-2 text-sm overflow-auto text-[14px] text-[#FAFAFA] font-medium text-left">
          {content}
        </p>
      </div>
    </div>
  );
};

export const Default = () => {
  return (
    <div className="h-full w-full flex flex-col gap-2 justify-center items-center text-sm mb-6">
      <div className="">
        <div className="w-[70px] h-[70px] rounded-2xl bg-icon-gradient border-[1px] border-greyscale-800 flex flex-row justify-center items-center">
          <div className="bg-[#F5EBB8] rounded-full w-[48px] h-[48px] flex flex-row items-center justify-center mx-auto  border-[8px] border-[#524F44]">
            <span className="text-black text-2xl font-bold ">
              <HoverIcon />
            </span>
          </div>
        </div>
      </div>
      <p className="text-sm text-[#bfbfbf] max-w-[174px] text-center font-regular">
        Hover on an element to know more about it.
      </p>
    </div>
  );
};
