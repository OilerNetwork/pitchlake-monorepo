# Oiler PitchLake

[![Tests](https://github.com/OilerNetwork/pitchlake_starknet/actions/workflows/test.yaml/badge.svg)](https://github.com/OilerNetwork/pitchlake_starknet/actions/workflows/test.yaml)

[![Telegram Chat][tg-badge]][tg-url]

[tg-badge]: https://img.shields.io/endpoint?color=neon&logo=telegram&label=chat&style=flat-square&url=https%3A%2F%2Ftg.sumanjay.workers.dev%2Foiler_official
[tg-url]: https://t.me/oiler_official

## Testing the Contracts

### Requires:

- [asdf](https://asdf-vm.com/) (for version handling)
- [scarb](https://docs.swmansion.com/scarb/) (2.12.1)

To ensure you are setup, run the following command from the root of this directory and check the output matches:

```
❯ scarb --version
scarb 2.12.1 (40d114d1e 2025-08-26)
cairo: 2.12.1 (https://crates.io/crates/cairo-lang-compiler/2.12.1)
sierra: 1.7.0
```

Once scarb is setup, you can run the test suites via:

```bash
# Test all tests, including ignored tests
make test-all

# Test only non-ignored tests
make test

# Test only ignored tests
make test-ignored

```

## Deploying the Contracts

The (deployment/)[./deployment/] directory contains Go code for deploying a PitchLake Vault contract to Starknet.

### Requires

- [golang](https://go.dev/) (1.23+)
- [scarb](https://docs.swmansion.com/scarb/) (2.12.1)

### Environment Variables

Copy the contents of [`example.env`](./example.env) to a new `.env` file (in this directory). The `example.env` file contains the necessary variables for deploying a Vault to Katana. You can modify the values in your `.env` to use a different deployer account, change the parameters of the Vault, or deploy to a different network.

### Usage

From this directory, run:

```bash
make deploy-local
```

This will:

- Build the contracts
- Declare the OptionRound & Vault contracts (if not already declared)
- Deploy a Vault contract with the parameters specified in your `.env` file

To skip building the contracts, you can run:

```bash
make deploy-local-no-build
```

## Protocol Documentation

The full protocol documentation can be found [here](<place holder>).
