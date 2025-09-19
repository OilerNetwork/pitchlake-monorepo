# Contract Documentation

Contents:

1. [Constructor, Events, Interfaces](#contracts-events-interfaces)

   - [Vault](#vault)
   - [Option Round](#option-round)
   - [Types](#types)

2. [Technical](#technical)

   - [Round Life Cycle](#round-life-cycle)
   - [Liquidity Flow](#liquidity)
   - [Transitioning Round States](#transitioning-round-states)
   - [Position Management](#position-management)

# Round Life Cycle

There are the four states an option round can be in:

```rust
enum OptionRoundState {
    Open, // Round deployed, accepting deposits, waiting for auction to start
    Auctioning, // Auction is ongoing, accepting bids until auction ends
    Running, // Auction has ended, waiting for round to settle
    Settled // Option round has settled, leftover liquidity has rolled over to the next round
}
```

A vault only ever has a single current round. Each round transitions through the four states above. When the vault is deployed, round 1 is `Open`. Over the course of the round, it transitions from `Open` to `Auctioning` to `Running`. Once round 1 becomes `Settled`, round 2 is deployed with state `Open`, round 2 becomes the current round, and the process repeats.

> **_💡 NOTE:_** An insight to note from the above is that a vault's current round is always either: `Open`, `Auctioning`, or `Running`. A vault's current round is never `Settled` because when a round settles, the next round is deployed and becomes the current round.

# Liquidity

There are 3 classifications for the ETH (liquidity) that LPs have deposited into a vault: unlocked, locked, and stashed. Liquidity (ETH) that "participates" in the protocol is either locked or unlocked, and liquidity that no longer participates in the protocol is stashed (inside the vault waiting for LPs to collect).

The standard flow for liquidity is unlocked -> locked -> unlocked -> locked -> ... However, LPs can chose to queue a percentage of their locked balance to be become stashed away once the current round settles, instead of becoming unlocked and continuing the cycle.

At any time, LPs can collect their stashed balance or withdraw from their unlocked balances, but locked liquidity is fixed inside the vault until the current round settles.

# Flow of Liquidity

When an LP deposits ETH, it is unlocked. Once the next auction starts, ALL unlocked liquidity becomes locked.

> **_NOTE:_** If the current round is `Open`, the next auction to start is the current round's. If the current round is `Auctioning` or `Running`, the next auction to start is the next round's (which has not been deployed yet).

Liquidity remains locked during the auction. Once the auction ends, the premium earned (options sold \* clearing price) becomes unlocked for LPs and the locked liquidity remains locked.

> **_NOTE:_** If less than the total options available sell in the auction, a portion of the locked liquidity is no longer needed to back the sold options. This excess locked liquidity becomes unlocked for LPs once the auction ends. E.g, if 1/3 of the options do not sell, then 1/3 of the locked liquidity becomes unlocked for LPs.

> **_NOTE:_** Now that LPs unlocked balances have just increased from the premium (and possibly from unsold options), they can withdraw from it, or leave it to roll over into the next round.

When the round settles, if there is a payout (TWAP > strike price), the total payout is sent from the locked liquidity to the settled option round (for OBs to claim by exercising their options). Any remaining locked liquidity (after payouts) becomes unlocked and rolls over to the next round. Any queued withdrawals are stashed away for LPs and not rolled over (unlocked).

## Transitioning Round States

There are 3 state transition functions accessible on the vault:

- `Vault::start_auction()`: Locks the unlocked liquidity and transitions the current round from `Open` to `Auctioning`.

- `Vault::end_auction()`: Allocates options/refunds to winning/losing bids, adds the premium to the unlocked liquidity, handles unsold options if there are any, and transitions the current round from `Auctioning` to `Running`.

- `Vault::fossil_callback(job_request, job_result)`: If this is the first callback it initializes the pricing data for round 1. Otherwise, it settles the current round (from `Running` to `Settled`), sends the total payout to the just settled round, stashes aside any queued withdrawals, unlocks the remaining liquidity, and deploys the new current round (with initial state `Open`).

## Position Management

# Constructor, Events, Interfaces

## Vault

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

- `verifier_address`: The Pitchlake Verifier contract address

- `eth_address`: The ETH address to use for deposits/withdrawals/bids/payouts

- `option_round_class_hash`: The class hash of the Option Round contract

- `alpha`: The alpha risk factor of the vault (in basis points, e.g., 1234 means: in a black swan event, liquidity providers should not lose more than 12.34% of their locked liquidity upon settlement)

- `strike_level`: The strike level of the vault (in basis points, e.g., -1000 means the strike price for round n + 1 is 10% below the settlement price of round n; 0 means the strike price for round n + 1 is equal to the settlement price of round n; 2500 means the strike price for round n + 1 is 25% above the settlement price of round n)

- `round_transition_duration`: The number of seconds between a round deploying and its auction starting

- `auction_duration`: The number of seconds a round's auction runs for

- `round_duration`: The number of seconds between a round's auction ending and the round settling

- `program_id`: This vault's program ID (used to verify Fossil data is for this vault)

- `proving_delay`: The proving delay (in seconds, this is about the time it takes for Fossil to be able to prove the latest block header)

</details>

<details>
<summary>Events</summary>
<br>

```rust
// Emitted when an account makes a deposit to a vault
struct Deposit {
  #[key]
  // The account that made the deposit
  pub account: ContractAddress,
  // The amount deposited (wei ETH amount)
  pub amount: u256,
  // The account's unlocked balance after the deposit
  pub account_unlocked_balance_now: u256,
  // The vault's total unlocked balance after the deposit
  pub vault_unlocked_balance_now: u256,
}

// Emitted when an account makes a withdrawal from a vault
struct Withdrawal {
  #[key]
  // The account that made the withdrawal
  account: ContractAddress,
  // The amount withdrawn (wei ETH amount)
  amount: u256,
  // The account's unlocked balance after the withdrawal
  account_unlocked_balance_now: u256,
  // The vault's total unlocked balance after the withdrawal
  vault_unlocked_balance_now: u256,
}

// Emitted when an account queues a % of their locked position to be stashed upon settlement
struct WithdrawalQueued {
  #[key]
  // The account that queued the withdrawal
  account: ContractAddress,
  // The percentage of the account's locked position they want stashed upon settlement
  // E.g, Queuing 2500 means that once the current round settles, 25% of the account's recently unlocked position will be stashed to the side, the rest will remain unlocked until withdrawn or the next round starts
  bps: u128,
  // The round ID the withdrawal was queued during
  round_id: u64,
  // The amount of ETH (wei) that was queued for withdrawal before the queue
  // I.e, If this is Alice's first time queuing a withdrawal, this value is 0 wei
  account_queued_liquidity_before: u256,
  // The amount of ETH (wei) that was queued for withdrawal after the queue
  // I.e, If Alice's locked postion is 10 ETH and she queues 2500 (25%) for withdrawal, this value is 2.5 ETH (in wei)
  account_queued_liquidity_now: u256,
  // The total amount of ETH (wei) in the vault that was queued for withdrawal after the queue
  vault_queued_liquidity_now: u256,
}

// Emitted when an account withdraws their stashed balance from the vault
struct StashWithdrawn {
  #[key]
  // The account that withdrew their stashed balance
  pub account: ContractAddress,
  // The amount withdrawn from the stashed balance (wei ETH amount)
  pub amount: u256,
  // The vault's total stashed balance after the withdrawal
  pub vault_stashed_balance_now: u256,
}

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

## Option Round

<details>
<summary>Constructor</summary>
<br>

```rust
struct ConstructorArgs {

}
```

- `verifier_address`: The Pitchlake Verifier contract address

- `eth_address`: The ETH address to use for deposits/withdrawals/bids/payouts

- `option_round_class_hash`: The class hash of the Option Round contract

- `alpha`: The alpha risk factor of the vault (in basis points, e.g., 1234 means: in a black swan event, liquidity providers should not lose more than 12.34% of their locked liquidity upon settlement)

- `strike_level`: The strike level of the vault (in basis points, e.g., -1000 means the strike price for round n + 1 is 10% below the settlement price of round n; 0 means the strike price for round n + 1 is equal to the settlement price of round n; 2500 means the strike price for round n + 1 is 25% above the settlement price of round n)

- `round_transition_duration`: The number of seconds between a round deploying and its auction starting

- `auction_duration`: The number of seconds a round's auction runs for

- `round_duration`: The number of seconds between a round's auction ending and the round settling

- `program_id`: This vault's program ID (used to verify Fossil data is for this vault)

- `proving_delay`: The proving delay (in seconds, this is about the time it takes for Fossil to be able to prove the latest block header)

</details>

<details>
<summary>Events</summary>
<br>

```rust
// Emitted when an account makes a deposit to a vault
struct Deposit {
  #[key]
  // The account that made the deposit
  pub account: ContractAddress,
  // The amount deposited (wei ETH amount)
  pub amount: u256,
  // The account's unlocked balance after the deposit
  pub account_unlocked_balance_now: u256,
  // The vault's total unlocked balance after the deposit
  pub vault_unlocked_balance_now: u256,
}

...
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

...
```

## Write Functions

```rust
/// Account Functions

// @dev The caller adds liquidity for an account's upcoming round deposit (unlocked balance)
// @param amount: The amount of liquidity to deposit
// @emit: Deposit event
// @return The account's updated unlocked position
fn deposit(ref self: TContractState, amount: u256, account: ContractAddress) -> u256;

...
```

</details>

## Types

<details>
<summary>Expand</summary>
<br>

```rust
struct ConstructorArgs {

}
```

</details>
