# Pitchlake Contracts Documentation

1. [Vault Contract](#vault-contract)

   - [Events](#vault-events)
   - [Interface](#vault-interface)
   - [Technical Details](#vault-technical-details)
     - [Available Actions](#vault-available-actions)
     - [Liquidity](#liquidity)
       - [Flow](#flow)
       - [Position Management](#position-management)
     - [Further](#vault-further)

2. [Option Round Contract](#option-round-contract)
   - [Events](#option-round-events)
   - [Interface](#option-round-interface)
   - [Technical Details](#option-round-technical-details)
     - [Round Life Cycle](#round-life-cycle)
     - [Available Actions](#option-round-available-actionss)
     - [Auction](#auction)
     - [Red-Black Tree Component](#red-black-tree-component)
     - [Tokenizing Options](#tokenizing-options)
     - [Further](#option-round-further)

## Vault Contract

### Vault Events

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

### Vault Interface

#### Vault Functions

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

#### Read Functions

```rust
/// Vault Parameters

// @dev Get the alpha risk factor of the vault
// E.g, 1234 means, 'in a black swap event, liquidity providers should not lost more than 12.34% of their liquidity'
fn get_alpha(self: @TContractState) -> u128;

// @dev Get the strike level of the vault
// E.g, -1000 means, 'if round N settles with a TWAP of 10 gwei, then round N+1's strike price is 9 gwei'
fn get_strike_level(self: @TContractState) -> i128;

// @dev Get the ETH address to use for deposits/withdrawals/bids
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

// @return The current option round id
fn get_current_round_id(self: @TContractState) -> u64;

// @return The contract address of the option round
fn get_round_address(self: @TContractState, option_round_id: u64) -> ContractAddress;

// @return This vault's program ID
// @dev This is used to verify Fossil data is for this vault
fn get_program_id(self: @TContractState) -> felt252;

// @return The proving delay (in seconds)
// @dev This is about the time it takes for Fossil to be able to prove the latest block header
fn get_proving_delay(self: @TContractState) -> u64;

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

### Vault Technical Details

#### Vault Available Actions

#### Liquidity

##### Flow

##### Position Management

#### Vault Further

## Option Round Contract

### Option Round Events

### Option Round Interface

#### Read Functions

#### Write Functions

### Option Round Technical Details

#### Round Life Cycle

#### Option Round Available Actions

#### Auction

#### Red-Black Tree Component

#### Tokenizing Options

#### Option Round Further

###### Extras

/// L1 Data

// For each round, L1 data is required to:
// 1) Settle the current round
// 2) Deploy/initialize the next round

// Round 1 requires a 1-time initialization with L1 data after the Vault's deployment (because
// there is no previous round), but upon its (and all subsequent round's) settlement the L1 data
// provided is also used to initialize the next round.
// The flow looks like this:
// -> Vault deployed
// _-> L1 data provided to initialize round 1
// -> Round 1 auction starts
// -> Round 1 auction ends
// _-> L1 data provided to settle round 1 and initialize round 2
// -> Round 2 auction starts
// -> Round 2 auction ends
// _-> L1 data provided to settle round n (2) and initialize round n + 1
// -> Round n + 1 auction starts
// -> Round n + 1 auction ends
// _-> L1 data provided to settle round n + 1 and initialize round n + 2
// ...

// Each of these job request is fulfilled and verified by the Pitchlake Verifier (via Fossil).
// They both result in the `fossil_callback` function being called by the verfier to provide the
// L1 data to the vault. This function is responsible for routing the data accordingly (either
// to initialize round 1, or to settle the current round and initialize the next round).
