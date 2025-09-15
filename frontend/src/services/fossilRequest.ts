"use server";
import { VaultStateType, OptionRoundStateType } from "@/lib/types";
import { createJobRequest } from "@/lib/utils";
import { FossilParams } from "@/lib/types";

export const makeFossilCall = async (params: FossilParams) => {
  const {
    targetTimestamp,
    roundDuration,
    clientAddress,
    vaultAddress,
    alpha,
    k,
  } = params;
  // Create request
  let request = createJobRequest({
    targetTimestamp,
    roundDuration,
    clientAddress,
    vaultAddress,
    alpha,
    k,
  });

  // Set API key
  request.headers["x-api-key"] = process.env.FOSSIL_API_KEY;

  // Send Fossil request
  try {
    const resp = await fetch(
      `${process.env.NEXT_PUBLIC_FOSSIL_API_URL}/pricing_data`,
      request,
    );
    if (!resp.ok) {
      console.error("Fossil request failed:", resp.statusText);
    }
    const data = await resp.json();
    return data;
  } catch (error) {
    console.error("Error sending Fossil request:", error);
  }
};
