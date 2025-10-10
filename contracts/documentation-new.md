# Pitchlake Smart Contract Documentation

## Overview

1. [Deployment, Events, Interfaces](#contracts-events-interfaces)

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
<summary>Deployment</summary>
<br>

**TODO**: Link to deployment guide

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

  - Range: (-∞%, ∞%) (`-MAX_i128 < strike_level < MAX_i128`) 

- `round_transition_duration`: The number of seconds between a round deploying and its auction starting

- `auction_duration`: The number of seconds a round's auction runs for

- `round_duration`: The number of seconds between a round's auction ending and the round settling

- `program_id`: This vault's program ID (used to verify Fossil data is for this vault)

- `proving_delay`: The proving delay (in seconds, this is about the time it takes for Fossil to be able to prove the latest block header)

</details>

<details>
<summary>Interface & Events</summary>
<br>

### Deposit

Use this function to add ETH to an `account`'s unlocked balance; `amount` is in wei, i.e, `123456789123456789 = 0.123456789123456789 ETH`. Alice can deposit ETH into Bob's position but he is in control of it afterwards; 

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
  // I.e, If Alice's locked position is 10 ETH and she queues 2500 (25%) for withdrawal, this value is 2.5 ETH (in wei)
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

#### Fossil Callback (Two Use Cases)

The first time this function is used is to initialize round 1; all subsequent times it is used to settle the current round. This function is only callable by the Pitcklake Verifier to send verified L1 data/calculations to the vault.

The L1 data is used the settle the current round and initialize the next. Since round 1 is the first round, the first time this function is called the data is used to initialize it. All other times this function will be used to settle round N and initialize round N + 1 (same txn).

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

Different events are emitted depending on the context of the call. These are the different event paths in order.

**Initializing Round 1**:

1.  `PricingDataSet` (routed from round to vault for emission)

2.  `FossilCallbackSuccessful`

**Settling Round N**:

1.  `OptionRoundSettled` (routed from round to vault for emission)

2. `OptionRoundDeployed`

3. `FossilCallbackSuccess`

First time this function is called:
```rust
// OptionRound's event (not emitted from OptionRound)
pub struct PricingDataSet {
    pub pricing_data: PricingData,
}

// (Event 1) What the Vault emits to centralize event emittions (this is what is emitted)
pub struct OptionRoundEmitted {
   pub round_id: u64,
   pub event_name: felt252,
   pub event: OptionRoundEvent, // OptionRoundEvent::PricingDataSet
}

// (Event 2)
pub struct FossilCallbackSuccess {
  pub l1_data: L1Data,
  pub timestamp: u64,
}
```

All other times this function is called:
```rust
// OptionRound's event (not emitted from OptionRound)
pub struct OptionRoundSettled {
  pub settlement_price: u256,
  pub payout_per_option: u256,
}  
 
// (Event 1) What the Vault emits to centralize event emittions (this is what is emitted)
pub struct OptionRoundEmitted {
  pub round_id: u64,
  pub event_name: felt252,
  pub event: OptionRoundEvent, // OptionRoundEvent::OptionRoundSettled
}

// (Event 2)
pub struct OptionRoundDeployed {
  pub round_id: u64,
  pub address: ContractAddress,
  pub auction_start_date: u64,
  pub auction_end_date: u64,
  pub option_settlement_date: u64,
  pub pricing_data: PricingData,
} 

// (Event 3)
pub struct FossilCallbackSuccess {
  pub l1_data: L1Data,
  pub timestamp: u64,
}
```
</details>

## Option Rounds

<details>
<summary>Deployment</summary>
<br>

**TODO**: Link to deployment guide

```rust
struct ConstructorArgs {
  pub vault_address: ContractAddress,
  pub round_id: u64,
  pub pricing_data: PricingData,
  pub round_transition_duration: u64,
  pub auction_duration: u64,
  pub round_duration: u64,
}
```

- `vault_address`: The parent vault of this option round.

- `round_id`: This round's ID (1, 2, 3, ...)

- `pricing_data`: The L1 data from fossil converted into pricing data for the options (strike price, cap level, reserve price)

- `round_transition_duration`: The number of seconds between a round deploying and its auction starting

- `auction_duration`: The number of seconds a round's auction runs for

- `round_duration`: The number of seconds between a round's auction ending and the round settling
</details>

<details>
<summary>Interface & Events</summary>
<br>

### State Transitioning

#### Set Pricing Data

This function is called by the parent vault when `Vault::fossil_callback()` is called for the first time. This sets the pricing data for the options so that the auction can start. This function is only needed for round 1's initialization. All future calls will set the pricing data in the round's constructor. 
```rust
fn set_pricing_data(ref self: TContractState, pricing_data: PricingData) -> u256;
```

Emits: 

For indexing purposes, all option round events are emitted from their parent vault contracts. This is the event that is routed to the vault for it to emit:


```rust
// OptionRound's event (not emitted from OptionRound)
pub struct PricingDataSet {
    pub pricing_data: PricingData,
}

// What the Vault emits to centralize event emittions (this is what is emitted)
pub struct OptionRoundEmitted {
  pub round_id: u64,
  pub event_name: felt252,
  pub event: OptionRoundEvent, // OptionRoundEvent::PricingDataSet
}
```

#### Start Auction

This function is called by the parent vault when `Vault::start_action()` is called; `starting_liquidity` is the amount of ETH (in wei) that is locked to start this round. 
```rust
    fn start_auction(ref self: TContractState, starting_liquidity: u256) -> u256;
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

This function is called by the parent vault when `Vault::end_action()` is called.
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

#### Settle Round

This function is called by the parent vault when `Vault::fossil_callback()` is called any time but the first. This settles the round and calculates the payout per options based on the `settlement_price`. 
```rust
// Return the clearing price (price per option) and total options sold
fn settle_round(ref self: TContractState, settlement_price: u256) -> u256;

```

Emits: 

For indexing purposes, all option round events are emitted from their parent vault contracts. This is the event that is routed to the vault for it to emit:

```rust
// OptionRound's event (not emitted from OptionRound)
pub struct OptionRoundSettled {
    pub settlement_price: u256,
    pub payout_per_option: u256,
}

// What the Vault emits to centralize event emittions (this is what is emitted)
pub struct OptionRoundEmitted {
    pub round_id: u64,
    pub event_name: felt252,
    pub event: OptionRoundEvent, // OptionRoundEvent::OptionRoundSettled
}
```

### Place Bids

Use this function to place a bid for this round's options. This call only succeeds if the round's state is `Auctioning` and if now <= the auction end date.

The ETH for each bid is sent to the option round contract where it is locked until the auction is over. When you place a bid, you are bidding an `amount` and `price`. Amount is the max number of options you want, and price is the max price you will pay per option (in wei).
```rust 
// Returns the bid that was just created
fn place_bid(ref self: TContractState, amount: u256, price: u256) -> Bid;
```

Emits:

```rust
// Emitted when a bid is placed in the auction. 
#[derive(Drop, Serde, PartialEq)]
pub struct BidPlaced {
    #[key]
    pub account: ContractAddress,
    // The ID given to this bid
    pub bid_id: felt252,
    // The max amount of options for this bid
    pub amount: u256,
    // The max price per option for this bid
    pub price: u256,
    // The nonce of the bids list (rb tree) after the bid is added
    pub bid_tree_nonce_now: u64,
}
```

### Update Bids

Use this function to edit one of your current bids. This call only succeeds if the round's state is `Auctioning` and if now <= the auction end date.

You can only increase the price of your bid (`bid_id`), you cannot decrease it. You cannot update a bid's amount, you may just create a new bid to do so.
```rust 
// Returns the new bid after editing
fn update_bid(ref self: TContractState, bid_id: felt252, price_increase: u256) -> Bid;
```

Emits:

```rust
// Emitted when a bid is updated
pub struct BidUpdated {
    #[key]
    pub account: ContractAddress,
    pub bid_id: felt252,
    pub price_increase: u256,
    pub bid_tree_nonce_before: u64,
    pub bid_tree_nonce_now: u64,
}
```

### Refund Losing Bids

Use this function to refund the ETH from losing bids after the auction is over for an `account`. This call will succeed any time after the auction is over, even many moons later if forgotten about. Alice can dispatch Bob's refunds for him. 
```rust 
fn refund_unused_bids(ref self: TContractState, account: ContractAddress) -> u256;
```

Emits:

```rust
// Emitted when an accounts refunds have been dispatched
pub struct UnusedBidsRefunded {
    #[key]
    pub account: ContractAddress,
    pub refunded_amount: u256,
}
```

...

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
