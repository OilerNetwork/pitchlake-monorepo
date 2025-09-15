"use client";
import { Vault } from "@/components/Vault/Vault";
import { useNewContext } from "@/context/NewProvider";
import { useEffect } from "react";

export default function Home({
  params: { address },
}: {
  params: { address: string };
}) {
  const { setVaultAddress } = useNewContext();

  useEffect(() => {
    if (address) {
      setVaultAddress(address);
    }
  }, [address]);

  return <Vault />;
}
