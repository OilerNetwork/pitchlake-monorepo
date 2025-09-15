"use server";

import { NextResponse } from "next/server";
import { createJobRequest } from "@/lib/utils";
import { FossilParams } from "@/lib/types";

export async function POST(request: Request) {
  // Parse the request body
  const body = await request.json();
  const params: FossilParams = body;

  const {
    targetTimestamp,
    roundDuration,
    clientAddress,
    vaultAddress,
    alpha,
    k,
  } = params;

  if (!targetTimestamp || !roundDuration || !clientAddress || !vaultAddress) {
    return NextResponse.json(
      {
        error:
          "Missing targetTimestamp, roundDuration, clientAddress, or vaultAddress parameter",
      },
      { status: 400 },
    );
  }

  // Create request
  let fossilRequest = createJobRequest({
    targetTimestamp,
    roundDuration,
    clientAddress,
    vaultAddress,
    alpha,
    k,
  });

  // Set API key (kept secret on the server side)
  fossilRequest.headers["x-api-key"] = process.env.FOSSIL_API_KEY;

  // Send Fossil request
  try {
    const resp = await fetch(
      `${process.env.NEXT_PUBLIC_FOSSIL_API_URL}/pricing_data`,
      fossilRequest,
    );

    if (!resp.ok) {
      if ((await resp.text()) === "Conflict") {
        return NextResponse.json({ data: "Conflict" });
      } else {
        console.error("Fossil request failed:", resp.statusText);
        // Return error response to the client
        return NextResponse.json(
          { error: "Fossil request failed: " + resp.statusText },
          { status: resp.status },
        );
      }
    }

    const data = await resp.json();
    // Return the data to the client
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error sending Fossil request:", error);
    // Return error response to the client
    return NextResponse.json(
      { error: "Error sending Fossil request: " + error.message },
      { status: 500 },
    );
  }
}
