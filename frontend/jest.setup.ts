import '@testing-library/jest-dom'

// Mock the @scure/starknet module
jest.mock('@scure/starknet', () => ({
  poseidonHashSingle: jest.fn((input: bigint) => {
    // Return a deterministic mock hash based on the input
    // This ensures tests are predictable while avoiding the actual cryptographic computation
    return BigInt(Math.abs(Number(input)) % 1000000);
  }),
}));

// Mock the starknet module globally
jest.mock('starknet', () => ({
  constants: {
    StarknetChainId: {
      SN_SEPOLIA: '0x534e5f5345504f4c4941',
      SN_MAIN: '0x534e5f4d41494e',
      SN_GOERLI: '0x534e5f474f45524c49',
    },
  },
  num: {
    toBigInt: jest.fn((value: any) => BigInt(value)),
    toHex: jest.fn((value: any) => `0x${value.toString(16)}`),
    toFelt: jest.fn((value: any) => value.toString()),
    toBN: jest.fn((value: any) => BigInt(value)),
    toCairoBool: jest.fn((value: any) => value ? 1 : 0),
  },
  BlockTag: {
    latest: 'latest',
    pending: 'pending',
  },
 
}));
