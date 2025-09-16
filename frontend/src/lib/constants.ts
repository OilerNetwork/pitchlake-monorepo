import { Account, Provider } from "starknet";

export const getDevAccount = (provider: Provider) => {
  if (process.env.NEXT_PUBLIC_DEV_ADDRESS && process.env.NEXT_PUBLIC_DEV_KEY)
    return new Account(
      provider,
      process.env.NEXT_PUBLIC_DEV_ADDRESS,
      process.env.NEXT_PUBLIC_DEV_KEY,
    );
  else return;
};
