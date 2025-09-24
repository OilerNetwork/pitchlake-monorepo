"use client";
import { Vault } from "@/components/Vault/Vault";
import { useNewContext } from "@/context/NewProvider";
import { useEffect, use } from "react";

export default function Home(
  props: {
    params: Promise<{ address: string }>;
  }
) {
  const params = use(props.params);

  const {
    address
  } = params;

  const { setVaultAddress } = useNewContext();

  useEffect(() => {
    if (address) {
      setVaultAddress(address);
    }
  }, [address]);

  return <Vault />;
}
