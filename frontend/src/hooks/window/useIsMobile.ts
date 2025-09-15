"use client";
import { useState, useEffect } from "react";

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  const targetWidth = 834; // Adjust this breakpoint as needed
  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < targetWidth);
    }
    // Initial check
    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return { isMobile };
};

export default useIsMobile;
