import { useState, useEffect } from "react";

export const useDemoTime = (
  active: boolean,
  isEnabled: boolean,
  intervalMS = 15000,
): { demoNow: number } => {
  const [demoNow, setDemoNow] = useState<number>(
    isEnabled ? new Date().getTime() / 1000 : 0,
  );

  useEffect(() => {
    if (!active || !isEnabled) return;

    const interval = setInterval(() => {
      setDemoNow(new Date().getTime() / 1000);
    }, intervalMS);

    return () => clearInterval(interval);
  }, [active, isEnabled, intervalMS]);

  // Ensure a valid return value
  return { demoNow: isEnabled ? Number(demoNow?.toFixed(0)) : 0 };
};
