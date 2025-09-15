"use client";
import React from "react";
import Link from "next/link";
import {
  ExternalLinkIcon,
  XIcon,
  MessagesSquareIcon,
  SendIcon,
} from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faXTwitter,
  faDiscord,
  faTelegramPlane,
} from "@fortawesome/free-brands-svg-icons";
import useIsMobile from "@/hooks/window/useIsMobile";

const Footer: React.FC = () => {
  const { isMobile } = useIsMobile();

  return (
    !isMobile && (
      <footer className="w-full bg-black h-[82px] flex flex-row text-white py-6 px-8 border-t border-greyscale-800 font-regular text-[14px]">
        <div className="w-full flex flex-row justify-between items-center">
          <div className="text-sm mb-4 md:mb-0 ml-0">
            Copyright © {new Date().getFullYear()} by Oiler
          </div>
          <div className="flex flex-row items-center">
            <Link
              href="/terms"
              className="cursor-pointer hover:text-greyscale flex items-center px-4 border-r-[2px] border-[#262626] last:border-none"
            >
              Terms of Service
            </Link>
            <Link
              href="/legal"
              className="cursor-pointer hover:text-greyscale flex items-center px-4 border-r-[2px] border-[#262626] last:border-none"
            >
              Legal & Risk Disclosure
            </Link>
            <Link
              href="/privacy"
              className="cursor-pointer hover:text-greyscale flex items-center px-4 border-r-[2px] border-[#262626] last:border-none"
            >
              Privacy Policy
            </Link>
            <Link
              href="https://oilernetwork.github.io/pitchlake-docs/"
              target="_blank"
              className="cursor-pointer hover:text-greyscale flex items-center px-4 border-r-[2px] border-[#262626] last:border-none"
            >
              Documentation
            </Link>
            <div className="flex items-center gap-4 ml-4">
              <Link
                href="https://twitter.com/OilerNetwork"
                target="_blank"
                aria-label="twitter"
              >
                <FontAwesomeIcon
                  icon={faXTwitter}
                  className="h-5 w-5 cursor-pointer hover:text-greyscale"
                />
              </Link>
              <Link
                href="https://discord.com/invite/qd5AAJPBsq"
                target="_blank"
                aria-label="discord"
              >
                <FontAwesomeIcon
                  icon={faDiscord}
                  className="h-5 w-5 cursor-pointer hover:text-greyscale"
                />
              </Link>
              <Link
                href="https://t.me/oiler_official"
                target="_blank"
                aria-label="telegram"
              >
                <FontAwesomeIcon
                  icon={faTelegramPlane}
                  className="h-5 w-5 cursor-pointer hover:text-greyscale"
                />
              </Link>
            </div>
          </div>
        </div>
      </footer>
    )
  );
  {
    // <footer className="w-[100%] bg-black h-[82px] pt-8 flex flex-row text-white py-6 px-8 border-t border-greyscale-800 opacity-90 font-regular text-[14px] ">
    //   <div className="container w-full flex flex-row justify-between absolute ">
    //     <div className="text-sm mb-4 md:mb-0 ml-0">
    //       Copyright © {new Date().getFullYear()} by Oiler
    //     </div>
    //     <div className="ml-auto flex flex-row justify-right md:justify-end items-center gap-4 right-0">
    //       <Link
    //         href="/terms"
    //         className="cursor-pointer hover:text-greyscale flex items-center"
    //       >
    //         Terms of Service
    //         {
    //           //<ExternalLinkIcon className="ml-1 h-4 w-4" />
    //         }
    //       </Link>
    //       <Link
    //         href="/legal"
    //         className="cursor-pointer hover:text-greyscale flex items-center"
    //       >
    ///         Legal & Risk Disclosure
    //         {
    //           //<ExternalLinkIcon className="ml-1 h-4 w-4" />
    //         }
    //       </Link>
    //       <Link
    //         href="/privacy"
    //         className="cursor-pointer hover:text-greyscale flex items-center"
    //       >
    //         Privacy Policy
    //         {
    //           //<ExternalLinkIcon className="ml-1 h-4 w-4" />
    //         }
    //       </Link>
    //       <Link
    //         href="/docs"
    //         className="cursor-pointer hover:text-greyscale flex items-center"
    //       >
    //         Documentation
    //         {
    //           //<ExternalLinkIcon className="ml-1 h-4 w-4" />
    //         }
    //       </Link>
    //       <div className="flex items-center gap-2">
    //         <FontAwesomeIcon
    //           icon={faXTwitter}
    //           className="h-5 w-5 cursor-pointer hover:text-greyscale"
    //         />
    //         <FontAwesomeIcon
    //           icon={faDiscord}
    //           className="h-5 w-5 cursor-pointer hover:text-greyscale"
    //         />
    //         <FontAwesomeIcon
    //           icon={faTelegramPlane}
    //           className="h-5 w-5 cursor-pointer hover:text-greyscale"
    //         />
    //       </div>
    //     </div>
    //   </div>
    // </footer>
  }
};

export default Footer;
