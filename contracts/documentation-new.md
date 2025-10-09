# Pitchlake Smart Contract Documentation

## Overview

1. [Constructor, Events, Interfaces](#contracts-events-interfaces)

   - [Vault](#vaults)
   - [Option Round](#option-round)
   - [Types](#types)

2. [Technical](#technical)

   - [Round Life Cycle](#round-life-cycle)
   - [Liquidity Flow](#liquidity)
   - [Transitioning Round States](#transitioning-round-states)
   - [Position Management](#position-management)

## Vaults

<details>
<summary>Constructor</summary>
<br>

```rust
struct ConstructorArgs {
  verifier_address: ContractAddress,
  eth_address: ContractAddress,
  option_round_class_hash: ClassHash,
  alpha: u128,
  strike_level: i128,
  round_transition_duration: u64,
  auction_duration: u64,
  round_duration: u64,
  program_id: felt252,
  proving_delay: u64,
}
```

- `verifier_address`: The Pitchlake Verifier contract address. This contract forwards verified L1 data from Fossil for option pricing/settlement.

- `eth_address`: The ETH address to use for deposits/withdrawals/bids/payouts

- `option_round_class_hash`: The class hash of the Option Round contract. 

- `alpha`: The alpha risk factor of the vault (in basis points, e.g., 1234 means: in a black swan event, liquidity providers should not lose more than 12.34% of their locked liquidity upon settlement). 

  - Range: [0.01%, 100.00%] (`0 < alpha <= 10_000`) 

- `strike_level`: The strike level of the vault (in basis points, e.g., -1000 means the strike price for round n + 1 is 10% below the settlement price of round n; 0 means the strike price for round n + 1 is equal to the settlement price of round n; 2500 means the strike price for round n + 1 is 25% above the settlement price of round n)

- `round_transition_duration`: The number of seconds between a round deploying and its auction starting

- `auction_duration`: The number of seconds a round's auction runs for

- `round_duration`: The number of seconds between a round's auction ending and the round settling

- `program_id`: This vault's program ID (used to verify Fossil data is for this vault)

- `proving_delay`: The proving delay (in seconds, this is about the time it takes for Fossil to be able to prove the latest block header)

</details>

<details>
<summary>Interface & Events</summary>
<br>

**Deposit**: Emitted when there is a deposit into a vault. Anyone can make a deposit for `account`. 

### Deposit

Use this function to add ETH to an `account`'s unlocked balance. Alice can deposit ETH into Bob's position but he is in control of it afterwards. `amount` is in wei; 123456789123456789 = 0.123456789123456789 ETH

```rust 
// Returns the account's updated unlocked balance
fn deposit(ref self: TContractState, amount: u256, account: ContractAddress) -> u256;
```

Emits:

```rust
// Emitted when a deposit is made to the vault
struct Deposit {
  #[key]
  pub account: ContractAddress,
  pub amount: u256,
  // The account's unlocked balance after the deposit
  pub account_unlocked_balance_now: u256,
  // The vault's total unlocked balance after the deposit
  pub vault_unlocked_balance_now: u256,
}
```

### Withdraw

Use this function to remove an `amount` of ETH from your unlocked balance. Only Alice can withdraw from her unlocked balance.

```rust 
// Returns the caller's updated unlocked position
fn withdraw(ref self: TContractState, amount: u256) -> u256;
```

Emits:

```rust
// Emitted when an account makes a withdrawal from a vault
struct Withdrawal {
  #[key]
  account: ContractAddress,
  amount: u256,
  // The account's unlocked balance after the withdrawal
  account_unlocked_balance_now: u256,
  // The vault's total unlocked balance after the withdrawal
  vault_unlocked_balance_now: u256,
}
```

### Queue Withdraw

Use this function to queue a percentage of your current round position to be stashed aside after settlement. Only Alice can adjust this `bps` value and it is reset to 0 after the current round settles. Queinging 5555 during round 10 means once round 10 settles and possible payouts are taken, 55.55% of Alice's remaining value is stashed aside for her to collect at any time (see next function). The leftover 44.45% remains active in the protocol and will be soon get locked into round 11 once its auction starts.

```rust 
    fn queue_withdrawal(ref self: TContractState, bps: u128);
```

Emits:

```rust
// Emitted when an account queues a % of their locked position to be stashed upon settlement
struct WithdrawalQueued {
  #[key]
  account: ContractAddress,
  bps: u128,
  round_id: u64,
  // The amount of ETH (wei) the `bps` represented before the update
  // I.e, If this is Alice's first withdrawal queue for the current round, this value is 0
  account_queued_liquidity_before: u256,
  // The amount of ETH (wei) the `bps` represented after the update
  // I.e, If Alice's locked postion is 10 ETH and she queues 2500 (25%) for withdrawal, this value is 2.5 ETH (in wei)
  account_queued_liquidity_now: u256,
  // The total amount of ETH (wei) in the vault that was queued for withdrawal after the queue
  vault_queued_liquidity_now: u256,
}
```

### Collect Stash

Use this function to release all stashed withdrawals for an `account`. Alice can call this function for Bob, sending Bob all of his stashed ETH.


```rust 
// Returns the amount collected
fn withdraw_stash(ref self: TContractState, account: ContractAddress) -> u256;
```

Emits:

```rust
// Emitted when an accounts stashed balance is withdrawn from the vault
struct StashWithdrawn {
  #[key]
  pub account: ContractAddress,
  pub amount: u256,
  pub vault_stashed_balance_now: u256,
}
```

### State Transitioning

#### Start Auction

Use this function to start the current round's auction. This call only succeeds if the current round is in state `Open` and now is >= its auction start date. Anyone can call this function when it is necessary. This function will call the same named function on the corresponding option round contract.

```rust
    // Returns the total number of options available in the auction
    fn start_auction(ref self: TContractState) -> u256;
```

Emits: 

For indexing purposes, all option round events are emitted from their parent vault contracts. This is the event that is routed to the vault for it to emit:


```rust
// OptionRound's event (not emitted from OptionRound)
pub struct AuctionStarted {
  // The amount of ETH (in wei) that is locked into this round at the time of the auction starting
    pub starting_liquidity: u256,
    // The number of options this round is able to auction
    pub options_available: u256,
}

// What the Vault emits to centralize event emittions (this is what is emitted)
pub struct OptionRoundEmitted {
        pub round_id: u64,
        pub event_name: felt252,
        pub event: OptionRoundEvent, // OptionRoundEvent::AuctionStarted
    }
```

#### End Auction

Use this function to end the current round's auction. This call only succeeds if the current round is in state `Auctioning` and now is >= its auction end date. Anyone can call this function when it is necessary. This function will call the same named function on the corresponding option round contract. At the end of the auction, the total premium (`options sold * clearing price`) is distributed to the liquidity providers' unlocked balances.

```rust
// Return the clearing price (price per option) and total options sold
fn end_auction(ref self: TContractState) -> (u256, u256);
```

Emits: 

For indexing purposes, all option round events are emitted from their parent vault contracts. This is the event that is routed to the vault for it to emit:

```rust
// OptionRound's event (not emitted from OptionRound)
pub struct AuctionEnded {
    pub options_sold: u256,
    pub clearing_price: u256,
    // If the starting liquidity is 1 ETH and 123 out of 1,000 options do not sell, then this value is 0.123 ETH (in wei). Any unsold liquidity is no longer locked, it becomes unlocked.
    pub unsold_liquidity: u256,
    // The nonce in the bid list (rb tree) of the clearing bid.
    pub clearing_bid_tree_nonce: u64,
}

// What the Vault emits to centralize event emittions (this is what is emitted)
pub struct OptionRoundEmitted {
        pub round_id: u64,
        pub event_name: felt252,
        pub event: OptionRoundEvent, // OptionRoundEvent::AuctionEnded
    }
```

#### Fossil Callback (Round Settlement/Initialization)

The first time this function is used is to initialize round 1; all subsequent times it is used to settle the current round. This function is only callable by the Pitcklake Verifier; it is used to send verified L1 data/calculations to the vault.

**Initializing Round 1**:

**Settling Round N**:

```rust
// @dev This function is called by the Pitchlake Verifier to provide L1 data to
// the vault.
// @dev This function uses the data to initialize round 1 or to settle the current round (and
// open the next).
// @returns 0 if the callback was used to initialize round 1, or the total payout of the settled
// round if it was used to settle
fn fossil_callback(
    ref self: TContractState, job_request: Span<felt252>, result: Span<felt252>,
) -> u256;
```

Emits: 

init:
- PricingDataSet

settlement:

- OptionRoundSettled
- OptionRoundDeployed

FossilCallbackSuccess

For indexing purposes, all option round events are emitted from their parent vault contracts. This is the event that is routed to the vault for it to emit:

```rust
// OptionRound's event (not emitted from OptionRound)
pub struct AuctionEnded {
    pub options_sold: u256,
    pub clearing_price: u256,
    // If the starting liquidity is 1 ETH and 123 out of 1,000 options do not sell, then this value is 0.123 ETH (in wei). Any unsold liquidity is no longer locked, it becomes unlocked.
    pub unsold_liquidity: u256,
    // The nonce in the bid list (rb tree) of the clearing bid.
    pub clearing_bid_tree_nonce: u64,
}

// What the Vault emits to centralize event emittions (this is what is emitted)
pub struct OptionRoundEmitted {
        pub round_id: u64,
        pub event_name: felt252,
        pub event: OptionRoundEvent, // OptionRoundEvent::AuctionEnded
    }
```




```rust

// Emitted when a new option round is deployed
struct OptionRoundDeployed {
  // The round ID of the newly deployed option round
  round_id: u64,
  // The address of the newly deployed option round contract
  address: ContractAddress,
  // The auction start date (unix timestamp in seconds) of the newly deployed option round
  auction_start_date: u64,
  // The auction end date (unix timestamp in seconds) of the newly deployed option round
  auction_end_date: u64,
  // The option settlement date (unix timestamp in seconds) of the newly deployed option round
  option_settlement_date: u64,
  // The strike level, cap level, and reserve price for the newly deployed option round
  pricing_data: PricingData,
}
```


    
```rust

    // @dev Ends the current round's auction
    // @return The clearing price and total options sold
    fn end_auction(ref self: TContractState) -> (u256, u256);

    // @dev This function is called by the Pitchlake Verifier to provide L1 data to
    // the vault.
    // @dev This function uses the data to initialize round 1 or to settle the current round (and
    // open the next).
    // @returns 0 if the callback was used to initialize round 1, or the total payout of the settled
    // round if it was used to settle
    fn fossil_callback(
        ref self: TContractState, job_request: Span<felt252>, result: Span<felt252>,
    ) -> u256;


```


```






// Emitted when the vault successfully accepts the data from the Pitchlake verifier
struct FossilCallbackSuccess {
  // The L1 data sent from Fossil
  l1_data: L1Data,
  // The upper bound for each of the pricing parameter calculations
  timestamp: u64,
}

```

</details>

 <details>
<summary>Interface</summary>
<br>

## Read Functions

```rust
/// Vault Parameters

// @dev Get the alpha risk factor of the vault
fn get_alpha(self: @TContractState) -> u128;

// @dev Get the strike level of the vault
fn get_strike_level(self: @TContractState) -> i128;

// @dev Get the ETH address
fn get_eth_address(self: @TContractState) -> ContractAddress;

// @dev The Pitchlake verifier contract address
fn get_verifier_address(self: @TContractState) -> ContractAddress;

// @dev The block this vault was deployed at
fn get_deployment_block(self: @TContractState) -> u64;

// @dev The number of seconds between a round deploying and its auction starting
fn get_round_transition_duration(self: @TContractState) -> u64;

// @dev The number of seconds a round's auction runs for
fn get_auction_duration(self: @TContractState) -> u64;

// @dev The number of seconds between a round's auction ending and the round settling
fn get_round_duration(self: @TContractState) -> u64;

// @return This vault's program ID
// @dev This is used to verify Fossil data is for this vault
fn get_program_id(self: @TContractState) -> felt252;

// @return The proving delay (in seconds)
// @dev This is about the time it takes for Fossil to be able to prove the latest block header
fn get_proving_delay(self: @TContractState) -> u64;

/// Option Rounds

// @return The current option round id
fn get_current_round_id(self: @TContractState) -> u64;

// @return The contract address of an option round
fn get_round_address(self: @TContractState, option_round_id: u64) -> ContractAddress;

/// Liquidity

// @dev The total liquidity in the Vault
fn get_vault_total_balance(self: @TContractState) -> u256;

// @dev The total liquidity locked in the Vault
fn get_vault_locked_balance(self: @TContractState) -> u256;

// @dev The total liquidity unlocked in the Vault
fn get_vault_unlocked_balance(self: @TContractState) -> u256;

// @dev The total liquidity stashed in the Vault
fn get_vault_stashed_balance(self: @TContractState) -> u256;

// @dev The total % (bps) queued for withdrawal once the current round settles
// E.g, 4444 means once the current round settles, 44.44% of the remaining liquidity will be stashed and not cycle to the next round
fn get_vault_queued_bps(self: @TContractState) -> u128;

// @dev The total liquidity for an account
fn get_account_total_balance(self: @TContractState, account: ContractAddress) -> u256;

// @dev The liquidity locked for an account
fn get_account_locked_balance(self: @TContractState, account: ContractAddress) -> u256;

// @dev The liquidity unlocked for an account
fn get_account_unlocked_balance(self: @TContractState, account: ContractAddress) -> u256;

// @dev The liquidity stashed for an account
fn get_account_stashed_balance(self: @TContractState, account: ContractAddress) -> u256;

// @dev The account's % (bps) queued for withdrawal once the current round settles
fn get_account_queued_bps(self: @TContractState, account: ContractAddress) -> u128;

/// Verifier Integration

// @dev Gets the (serialized) job request required to initialize round 1
// @dev This job's result is only used once
fn get_request_to_start_first_round(self: @TContractState) -> Span<felt252>;

// @dev Gets the (serialized) job request required to settle the current round
// @dev This job's result is used for each round's settlement. It is also used to initialize the
// next round.
fn get_request_to_settle_round(self: @TContractState) -> Span<felt252>;
```

## Write Functions

```rust
/// Account Functions

// @dev The caller adds liquidity for an account's upcoming round deposit (unlocked balance)
// @param amount: The amount of liquidity to deposit
// @emit: Deposit event
// @return The account's updated unlocked position
fn deposit(ref self: TContractState, amount: u256, account: ContractAddress) -> u256;

// @dev The caller takes liquidity from their upcoming round deposit (unlocked balance)
// @param amount: The amount of liquidity to withdraw
// @emit: Withdrawal event
// @return The caller's updated unlocked position
fn withdraw(ref self: TContractState, amount: u256) -> u256;

// @dev The caller queues a % of their locked balance to be stashed once the current round
// settles
// @param bps: The percentage points <= 10,000 the account queues to stash when the round settles
// @emit: WithdrawalQueued event
fn queue_withdrawal(ref self: TContractState, bps: u128);

// @dev The caller withdraws all of an account's stashed liquidity for the account
// @param account: The account to withdraw stashed liquidity for
// @emit: StashWithdrawn event
// @return The amount withdrawn
fn withdraw_stash(ref self: TContractState, account: ContractAddress) -> u256;

/// State Transition Functions

// @dev Start the current round's auction
// @dev Callable by anyone as long as now >= auction_start_date
// @return The total options available in the auction
fn start_auction(ref self: TContractState) -> u256;

// @dev Ends the current round's auction
// @dev Callable by anyone as long as now >= auction_end_date
// @return The clearing price and total options sold
fn end_auction(ref self: TContractState) -> (u256, u256);

// @dev This function is called by the Pitchlake Verifier to provide L1 data to
// the vault.
// @dev This function uses the data to initialize round 1 or to settle the current round (and
// open the next).
// @emit: Always emits a FossilCallbackSuccess event and for each callback except the first, it emits an OptionRoundDeployed event
// @returns 0 if the callback was used to initialize round 1, or the total payout of the settled
// round if it was used to settle
fn fossil_callback(ref self: TContractState, job_request: Span<felt252>, result: Span<felt252>) -> u256;
```

</details>

## Option Rounds
