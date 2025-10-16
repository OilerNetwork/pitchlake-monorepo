# Pitchlake Smart Contract Documentation

## Overview

1. [Vault Contract](#vaults)

2. [Option Round Contract](#option-rounds)

3. [Technical Deep Dives](#technical-deep-dive)

    - [Fossil Integration](#fossil-integration)
    - [Option Pricing and Payout](#option-pricing-and-payout)
    - [Option Round Lifecycle](#option-round-lifecycle)
    - [Liquidity Flow](#liquidity-flow)
    - [Position Management](#position-management)
    - [Auction Mechanics](#auction-mechanics)

## Vaults

<details>
<summary>Deployment</summary>
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
fn deposit(amount: u256, account: ContractAddress) -> u256;
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
fn withdraw(amount: u256) -> u256;
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
fn queue_withdrawal(bps: u128);
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
fn start_auction() -> u256;
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

// What the Vault emits to centralize event emission (this is what is emitted)
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
fn end_auction() -> (u256, u256);
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

// What the Vault emits to centralize event emission (this is what is emitted)
pub struct OptionRoundEmitted {
    pub round_id: u64,
    pub event_name: felt252,
    pub event: OptionRoundEvent, // OptionRoundEvent::AuctionEnded
}
```

#### Fossil Callback (Two Use Cases)

This function is used to get verified L1 data/calculations to the vault; only the Pitchlake Verifier can call this function. The L1 data is used the settle the current round and initialize the next. Since round 1 is the first round, the first time this function is called the data is used to just initialize round 1. All other times this function will be used to settle round N AND initialize round N + 1 (in the same txn).

```rust
// @dev This function is called by the Pitchlake Verifier to provide L1 data to
// the vault.
// @dev This function uses the data to initialize round 1 or to settle the current round (and
// open the next).
// @returns 0 if the callback was used to initialize round 1, or the total payout of the settled
// round if it was used to settle
fn fossil_callback(job_request: Span<felt252>, result: Span<felt252>) -> u256;
```

Emits:

Different events are emitted depending on the context of the call. These are the different event paths in order.

**Initializing Round 1**:

1.  `PricingDataSet` (routed from round to vault for emission)

2.  `FossilCallbackSuccessful`

**Settling Round N**:

1. `OptionRoundSettled` (routed from round to vault for emission)

2. `OptionRoundDeployed`

3. `FossilCallbackSuccess`

First time this function is called:

```rust
// OptionRound's event (not emitted from OptionRound)
pub struct PricingDataSet {
    pub pricing_data: PricingData,
}

// (Event 1) What the Vault emits to centralize event emission (this is what is emitted)
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

// (Event 1) What the Vault emits to centralize event emission (this is what is emitted)
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

### State Transitioning/Vault-Only Functions

These functions are only callable by the round's parent Vault contract.

#### Set Pricing Data

This function is called by the parent vault when `Vault::fossil_callback()` is called for the first time. This sets the pricing data for the options so that the auction can start. This function is only needed for round 1's initializatin, for all other rounds, the pricing data is set in the constructor.

```rust
fn set_pricing_data(pricing_data: PricingData) -> u256;
```

Emits:

For indexing purposes, all option round events are emitted from their parent vault contracts. This is the event that is routed to the vault for it to emit:

```rust
// OptionRound's event (not emitted from OptionRound)
pub struct PricingDataSet {
    pub pricing_data: PricingData,
}

// What the Vault emits to centralize event emission (this is what is emitted)
pub struct OptionRoundEmitted {
  pub round_id: u64,
  pub event_name: felt252,
  pub event: OptionRoundEvent, // OptionRoundEvent::PricingDataSet
}
```

#### Start Auction

This function is called by the parent vault when `Vault::start_action()` is called; `starting_liquidity` is the amount of ETH (in wei) that is locked to start this round.

```rust
// Returns the total number of options available in the auction
fn start_auction(starting_liquidity: u256) -> u256;
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

// What the Vault emits to centralize event emission (this is what is emitted)
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
fn end_auction() -> (u256, u256);
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

// What the Vault emits to centralize event emission (this is what is emitted)
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
fn settle_round(settlement_price: u256) -> u256;

```

Emits:

For indexing purposes, all option round events are emitted from their parent vault contracts. This is the event that is routed to the vault for it to emit:

```rust
// OptionRound's event (not emitted from OptionRound)
pub struct OptionRoundSettled {
    pub settlement_price: u256,
    pub payout_per_option: u256,
}

// What the Vault emits to centralize event emission (this is what is emitted)
pub struct OptionRoundEmitted {
    pub round_id: u64,
    pub event_name: felt252,
    pub event: OptionRoundEvent, // OptionRoundEvent::OptionRoundSettled
}
```

### Option Buyer Functions

#### Place Bids

Use this function to place a bid for this round's options. This call only succeeds if the round's state is `Auctioning` and if now <= the auction end date.

The ETH for each bid is sent to the option round contract where it is locked until the auction is over. When you place a bid, you are bidding an `amount` and `price`. Amount is the max number of options you want, and price is the max price you are willing to pay per option (in wei).

```rust
// Returns the bid that was just created
fn place_bid(amount: u256, price: u256) -> Bid;
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

#### Update Bids

Use this function to edit one of your current bids. This call only succeeds if the round's state is `Auctioning` and if now <= the auction end date.

You can only increase the price of your bid (`bid_id`), you cannot decrease it. You cannot update a bid's amount, you may just create a new bid to do so.

```rust
// Returns the new bid after editing
fn update_bid(bid_id: felt252, price_increase: u256) -> Bid;
```

Emits:

```rust
// Emitted when a bid is updated
pub struct BidUpdated {
    #[key]
    pub account: ContractAddress,
    // The ID of the bid updated
    pub bid_id: felt252,
    // How much the price increased for this bid (in wei)
    pub price_increase: u256,
    // The nonce of the bid in the bid tree before the update
    pub bid_tree_nonce_before: u64,
    // The nonce of the bid in the tree after the update (is new global nonce)
    pub bid_tree_nonce_now: u64,
}
```

#### Refund Losing/Unused Bids

Use this function to refund the ETH from unused bids after the auction is over for an `account`. This call will succeed any time after the auction is over, even many moons later if forgotten about. Alice can dispatch Bob's refunds for him.

> **Note:** Once the auction concludes, the price each bidder ends of paying per option is the same (this is the __clearing price__). Bids are refunded if they lose (i.e bid price is less than clearing price), or if a winning bid's price is above the clearing price (i.e bid price is 1 gwei and clearing price is 0.5 gwei, 0.5 gwei is refundable). See [auction mechanics](#auction-mechanics) for more details.

```rust
// Returns the total amount of ETH (in wei) refunded to the account
fn refund_unused_bids(account: ContractAddress) -> u256;
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

### Mint Purchased Options

After the auction, options are 'distributed' to winning bidders. These options by default are not tokens, they are mapped to the bidder and this balance is calculated when the user exercises them later (next function). If an option holder needs to transfer these options to a new account or wishes to sell them in a secondary market before settlement, they can use this function to mint all of their options into ERC-20 tokens.

```rust
// Returns the number of option tokens minted
fn mint_options(ref self: TContractState) -> u256;
```

Emits:

```rust
// Emitted when an accounts mints their options into ERC-20 tokens
pub struct OptionsMinted {
  #[key]
  pub account: ContractAddress,
  pub minted_amount: u256,
}
```

### Exercising Options

Use this function to exercise your options for this round. This call will succeed any time after the round becomes `Settled`. This function does not distiguish between minted (ERC-20) options and un-minted options; it will burn any minted options and flag any un-minted as non-mintable once exercised. Only Alice can exercise her options.

```rust
fn exercise_options(ref self: TContractState) -> u256;
```

Emits:

```rust
// Emitted when an accounts refunds have been dispatched
pub struct OptionsExercised {
  #[key]
  pub account: ContractAddress,
  // How many options were exercised (total)
  pub total_options_exercised: u256,
  // How many of the options were ERC-20 (minted) options
  pub mintable_options_exercised: u256,
  // The total ETH (in wei) amount that was given to the account
  pub exercised_amount: u256,
}
```

</details>


## Technical Deep Dive

### Fossil Integration

Fossil is used to supply L1 data (and computations performed on L1 data) from specific timestamp ranges to a vault. Data from Fossil is needed once per round, at the very end. The data received from Fossil is used to settle the current round, and initialize/deploy the next, the values are:

- `TWAP` - The TWAP of L1 basefee over the last 30 days
    - This is used as the settlement price for the current round, and is used to determind the strike price of the next round
- `max_return` - The max 30d returns of 30d TWAPs in the last 3 months. This is essentially the most the 30d TWAP has moved in the last 3 months. 
    - This is used to calculate the cap level for the next round
- `reserve_price` - The calculated minimum price to charge for a single option. 
    - This is the minimum bid price per option in the next round's auction

### Option Pricing and Payout

#### What is a Pitchlake option ? 

When you purchase a single Pitchlake option, the underlying asset is the (30 day) TWAP of basefee for a single unit of gas. For example, you purchase 1,000,000,000 (1 billion) options with a strike price of 1 gwei. 30 days later (the settlement date), if the actual TWAP of basefee is 3 gwei, then each option pays out `(3 - 1) = 2 gwei` totaling: `1_000_000_000 * 2 = 2 billion gwei = 2 ETH` (assuming an uncapped payout). If the settlement price is less than or equal to the strike price (i.e `strike price = 1 gwei`, `settlement price <= 1 gwei`), then the payout per option is `0`.

#### How much does an option cost ? 

The **reserve price** that we get from Fossil is the minimum price per option that this round will accept. This is the minimum price option buyers (OBs) will need to bid, the resulting clearing price may be above the reserve price if there is higher demand for the options, but will not be below this value (unless no options sell, then the clearing price will be `0`). The clearing price multiplied by the total number of options sold is known as the **premium**; this is the fee that the OBs pay to obtain the options, and it is paid out to the liquidity providers (LPs). 

The reserve price from Fossil is a fairly complex algorithm using historical data/trends/forecasting/Black–Scholes to calculate the minimim price that one of these options should cost. [Here](https://github.com/OilerNetwork/fossil-offchain-processor/blob/main/crates/server/src/pricing_data/reserve_price.rs) is the reference code before optimization for the zkvm.

#### How many options are there per round and what is the max payout per option ? 

Since this is crypto, collateral for a potential payout needs to be locked up front (since we cannot expect an anonymous address to pay after the fact). This collateral is supplied by liquidity providers (LPs), and along with the __cap level__ we can determine the total number of options available in a given round's auction. 

_Cap Level_

The cap level is a percentage that defines the maxium an option will pay out above the strike price (i.e if strike price is 1 gwei, and cap level is 150%, then the max payout for this option is 1.5 gwei; from our previous example, with a strike price of 1 gwei and a settlement price of 3 gwei, the payout would not be 2 gwei, it would be capped at 1.5 gwei (per option)).

This cap level is calculated to reduce the possibility of LPs getting drained in a black swan event. The goal is for the option payout to never be capped; if an option's payout is capped, that means 100% of LP deposits were used for the payout. As a reminder:

  - `max returns` - This is the most the underlying asset has moved in the last 90 days (can be thought of as a hypothetical black swan event)

  - `alpha` - This is how much liquidity providers are expected to lose in a black swan event

  - `k` - The strike level of a vault; this is a percentage value that determines the strike price for a round.

      - k = 0%, this means round N+1's strike price is equal to round N's settlement price
      - k = 10%, this means round N+1's strike price is 10% higher than round N's settlement price
      - k = -10%, this means round N+1's strike price is 10% lower than round N's settlement price

```
cap_level = (max_returns - k) / (alpha * (1 + k))
```

For a basic (ATM) vaults, this simplifies the equation to:

```
cap_level = max_returns / alpha
```

If alpha is 10%, then the cap level becomes `cap_level = 10 * max_returns`. Since max returns is our 'realistic black swan event', this means if the TWAP moves this much during the round, only 10% of deposits would be used for the payout. 

_Total Options Per Round_

Once a round's auction starts, all deposits are locked for this round, this is known as the **starting liquidity**. The calculation for total number of options available per round is:

```rust
// The max one option will pay out
// i.e, 1 gwei * 350% = 3.5 gwei
capped_payout = strike_price * cap_level 

// The total number of options available in this round's auction
// i.e, 7_000_000_000 gwei / 3.5 gwei = 2_000_000_000 options
// - In english, LPs supply 7 ETH to sell 2 billion options.
// - If the settlement price is > 1.0 gwei, each option will pay out > 0
total_number_of_options = starting_liquidity / capped_payout
```

> **💡 Summary:** If alpha (risk) for a vault is low (say 10%), then the max payout for the options will be high (~10x the max we've seen the price move the last 3 months). This means the options are unlikely to reach their capped payout, but since the cap is so high, there are fewer options sold. On the contrast, if a vault is very risky (say 99.99% alpha), then the capped payout for the options is low (~ the max we've seen the price move in the last 3 months). This means risky vaults (high alpha) sell more options with a lower cap level that is more likely to be reached. If the payout gets capped, all locked liquidity (posted collateral) would be lost for LPs (they will still profit the premium no matter how much locked liquidity gets used for the payout).

### Option Round Lifecycle

Vaults sell options in rounds, one after the next. A vault always has a __current round__; the state lifecylcle for an option round is:

`Open` -> `Auctioning` -> `Running` -> `Settled`

When a round is deployed, its state is `Open` and it becomes the vault's current round. Once its auction starts its state becomes `Auctioning`, when its auction ends it becomes `Running`, and finally, upon settlement it becomes `Settled`. In the same txn that round N settles, round N + 1 is deployed (as `Open` and is the new current round).

> **💡 Note:** A conclusion that can be drawn from this is that a vault's current round is ALWAYS: `Open`, `Auctioning`, or `Running`; the current round is NEVER `Settled`, but all previous rounds are. 

#### Open

In this state LPs are depositting and withdrawing from their positions. OBs have nothing to do in this round until the auction starts.

#### Auctioning

All (LP) deposits have been locked inside the vault for this round. OBs can now place bids for the options that are available.

#### Running

The auction is over. All premium has been added to LP (unlocked) positions, if any options did not sell in the auction, some of the locked liquidity becomes unlocked for LPs. Options have been delegated for winning bids and refunds have been delegated for losing/over bids. 

OBs can refund at this time or any time afterwards if forgotton about. While awaiting settlement, OBs can optionally mint their options into ERC-20 tokens. 

> **💡 Note:** Minting options allows for short (30d) secondary markets for the round's options. The price of these options on the secondary market will flucuate throughout the round, but will approach the actual payout of the option as the settlement date is reached (at the settlement date the price of an option is fixed, since anyone can now take this option token and exercise it for the payout).

#### Settled

The payout per option becomes fixed, and OBs can now exercise options for this round (if forgotten about, an OB can exercise at any time in the future). Exercising does not distinguish between a 'delgated' option and a minted option (either way these options are burned/flagged as exercised).

### Liquidity Flow

Liquidity (a position) is split into 3 classifications/buckets: unlocked, locked, and stashed. 

#### Unlocked Liquidity

This is ETH that is not currently being used as collateral in a round. LPs can withdraw from this balance at any time. As soon as the next auction starts, all unlocked liquidity will become locked. After an auction ends, the premium collected will be added to LP unlocked balances immediatelty. 

#### Locked Liquidity

This is ETH that is being used as collateral in a round. This ETH remains locked while it is needed for a potential payout. If some options do not sell in the auction, some locked liquidity will become unlocked at the end of the auction (since it is no longer needed for a potential payout). At the end of the round, the remaining liquidity (locked - payout) becomes unlocked, repeating the cycle once the next auction starts. 

#### Stashed Liquidity

As mentioned above, liquidity will continuously flow between unlocked -> locked -> unlocked -> locked as each next round starts. If an LP wishes to stop this cycle, they will need to show up between round N settling and round N + 1's auction starting; in this short (few hour) window, all liquidity is unlocked, so LPs can withdraw what they wish, and let the rest become locked into the next auction. 

This is not ideal since an LP may not be able to time this window, instead, during each round, an LP can choose to "queue" a withdrawal. For example, Alice has 1 ETH locked into the vault for the current round. She wants to exit most of her position after this round, but does not think she will be awake when the current round settles and before the next auction starts. To overcome this, Alice uses the `queue_withdrawal` function described earlier to queue 75% of her position for withdrawal. This means once the current round settles, 75% of Alices remaining liquidity (1 ETH minus her cut of the payout if there is one) is "stashed" aside, the reamining 25% becomes unlocked, and eventually locked a few hours later. Alice can then show up any time in the future and collect her stash. 

#### Notes

- Every time an LP deposits ETH, it is added to their unlocked balance

    - If the current round is `Open`, this unlocked balance will become locked shortly, once this round's auction starts
    - If the current round is `Auctioning` or `Running`, this unlocked balance will sit a bit, until the next round's auction starts

- When an LP withdraws ETH, it comes from their unlocked balance

- When an auction starts, ALL unlocked liquidity becomes locked

- When an auction ends, ALL premiums are added to LP unlocked balances. If any options are unsold, that portion of the locked liquidity becomes unlocked

- When a round settles, the payout is taken from the locked liquidity, the remaining liquidity either becomes stashed or unlocked.

### Position Management

Upon each state transition of a vault's round, LP positions are updated proportional to their share of the round's liquidity. Unlike standard token contracts like ERC-20, LP positions (locked/unlocked/stashed balances) are not stored in simple `address -> number` mappings. Instead, a mapping and pointers/flags are used to dynamically calculate an LP's position when needed. This is done to avoid iterating over each LP and updating their position every time the round's state transitions.

> **💡 Note:** Without using a calcuate-on-the-spot method, the Pitchlake protocol would not be possible. Imagine there are 1,000 LPs in a vault, once the next auction starts, all LP unlocked balances become locked, that would mean we'd need 2,000 storage writes track that. Instead, when we fetch an LP's balance, we perform come calculations on previous checkpoints/round outcomes/etc to determind the value of the position now. 

Positions are tracked in a deposit mapping along with checkpoints. For example, if this is Alice's first time depositing (1 ETH for the upcoming round which is 2), this is stored in the mapping like so: `positions[0xAlice, 2] = 1 ETH`. If Alice does not participate in the protocol (deposit/withdraw) for 10 rounds, this is still the only thing that is stored regarding her position. 

For example, now the current round is 11 and Alice wants to deposit an additional 1 ETH. To do so, we first refresh Alice's position so that it is represented in the storage mapping for the current and upcoming round. For simplicity, lets say her original 1 ETH is now worth 1.2 ETH (before her additional deposit). This position is calculated by looking at Alice's checkpoint (0) and looping through each round the position sat in and computing the position's value up to the current round. The refreshed position looks like this: `positions[0xAlice, 11] = 1.2 ETH, positions[0xAlice, 12] = 0` (and her checkpoint is update from 0 to 10, so that all storage slots < 11 can be ignored in the future). Now that the position is refreshed, we add the new deposit: `positions[0xAlice, 11] = 1.2 ETH, positions[0xAlice, 12] = 1 ETH`. Here is a view of the `deposit` function: 


```rust
// @dev Caller deposits liquidity for an account in the upcoming round
fn deposit(amount: u256, account: ContractAddress) -> u256 {
    // -> Step 1) Refresh the account's current and upcoming round deposits
    //    - This updates the values in the position mapping for the current and upcoming round ids
    //    - It also updates the checkpoint if necessary
    self.refresh_position(account);

    // -> Step 2) Fetch the (just updated) deposit for the upcoming round
    let upcoming_round_id = self.get_upcoming_round_id();
    let upcoming_round_deposit = self
        .positions
        .entry(account)
        .entry(upcoming_round_id)
        .read();

    // -> Step 3) Update the upcoming round deposit for the account
    let account_unlocked_balance_now = upcoming_round_deposit + amount;
    self
        .positions
        .entry(account)
        .entry(upcoming_round_id)
        .write(account_unlocked_balance_now);

    // -> Step 4) Update the total unlocked balance for the vault
    let vault_unlocked_balance_now = self.vault_unlocked_balance.read() + amount;
    self.vault_unlocked_balance.write(vault_unlocked_balance_now);

    // Transfer eth from caller to this contract, emit event ...

    return account_unlocked_balance_now;
}
```

Refreshing a position requires looping from after the checkpoint round to the current round. Since we know flow of liquidity, we can use this to compute the value of the position up to the current round. To start, we look at Alice's checkpoint (0 in the first example), to get her initial deposit value (1 ETH in round 2). We use round 2's outcome (total unsold liquidity/premium/payouts) to determine how much liquidity remained at the end of round 2. Using round 2's starting liquidity and Alice's initial 1 ETH amount, we can determine her portion of the round 2 pool (for example if round 2 profits 1 ETH and Alice supplied 25% of the starting liquidity, she profitted 0.25 ETH this round). Since Alice's position is untouched, we know her full remaining round 2 balance (1.25 ETH) was locked at the start of round 3. We repeat the same process to know the value at the end of round 3 (and thus the start of round 4), and do this until we get to the current round, where we see that Alice's position is worth 1.2 ETH at the start of round 11.

Now that the position mapping and checkpoint is refreshed, the storage/updating becomes much simpler, we only need to deal with the position slots for round 11 and 12 (depending on the state of round 11 at this time). There are additional nuances that are outlined in the codebase, for example, when we loop through rounds to compute a position's value, we also need to account for the possibility that the LP may have queued a withdrawal during a round. In this case we need to calculate how much was stashed, and use this remaining value for the next iteration's start. There is also additional logic for position refreshing depending on the state of the current round that is further outlined in the contracts themselves (for example refreshing a position while the current round is `Running` means the premiums/unsold liquidity could be set a deposit for the upcoming round).

#### Further

Similar calcualte-on-the-fly mechanisms are used for other user states as well. For example, after an auction ends, it is not reasonable to actually calculate/distribute refunds or calculate/mint options to each option buyer. Instead, we just keep track of global variables like the clearing price and clearing bid, and use this information to compute an OB's refundable balance when we need it (same for computing the number of options an OB receives from the auction). 

This compute-as-needed functionality is required to keep gas costs minimal and to resepect typical smart contract practices. Outside of blockchain, it would be much easier to simply update each user's position/option balance/refundable balance/etc as rounds transitioned states. This is why there appears to be additional fields emitted in each event. The extra data emitted in the events allow our off-chain contract indexer to compute user states in a more typical approach (adjusting actual DB tables for an LP's unlocked balance when an auction starts for example).

### Auction Mechanics

Options are sold in a fair batch auction. This means OBs place bids for batches of options, and in the end, the auction determines the **clearing price** that sells the most options for the most premium. When an OB makes a bid, they input a **price** and **amount**. A bid's price is the max price the OB is willing to pay for a single option, and a bid's amount is the max number of options the OB wants to receive. An OB can increase an exisiting bid's price, or create additional bids for different prices/amounts. 

The primary goal of the auction is to sell as many options as it can, the secondary goal is to maximize the clearing price that will sell all of these options. For each of these examples, assume there are 100 total options available:

- Alice bids `{price: 1 gwei, amount: 75}`, Bob bids `{price: 2 gwei, amount: 50}`. The clearing price is 1 gwei because this will sell the most options (if the clearing price were 2, we'd only sell 50/100 options because Alice's bid price is below it).

- Alice bids `{price: 1 gwei, amount: 75}`, Bob bids `{price: 2 gwei, amount: 50}`, Charlie bids `{price: 3 gwei, amount: 60}`. The clearing price is 2 gwei because this will sell all of the options for the highest price possible. A clearing price of 3 gwei would not sell all of the options, and a clearing price of 1 gwei would not maximize the premium. In this example, Alice's bid is fully refundable. Charlie's bid is ranked higher than Bob's because it has a higher price, therefore Charlie receives his full bid amount of 60 options (because Charlie bid 3 gwei per options but the clearing price is 2, he is refuned 1 gwei for each of the 60 options he receives). The remaining 40 options go to Bob, and the 10 options Bob bid for that he did not receive become refundable. 

- Alice bids `{price: 1 gwei, amount: 50}`, Bob bids `{price: 2 gwei, amount: 50}`, Charlie bids `{price: 1 gwei, amount: 50}`. In this case the clearing price is 1 gwei since 2 gwei would not sell all of the options. When it comes to ranking/sorting bids, the first sorting priority is a bid's price (higher priced bids are ranked higher than lower priced bids), if prices are equal, the next sorting priority is chronological order (earlier bids are ranked higher than later bids). This means Bob's bid is ranked above Alice's bid (because of its higher price) which is ranked above Charlie's bid (because he placed his bid after Alice). Therefore, Bob gets his 50 options ge bid for (with a refund of 1 gwei per option), Alice receives the 50 option she bid for, and Charlie's full bid is refundable. It is worth noting here that a bid's amount has no impact on its sorting, just its price and chronological order with other bids in its price tier.

OBs can place any number of bids. These bids are stored inside of a Red Black tree for optimal storage costs (for storing/sorting the bids list). Even though bids are stored in a tree, they can be imagined as a sorted list by price and chronological order. For example, the following is a list of bids in their sorted fashion, with #1 being the highest ranked bid, and #6 being the lowest ranked bid.

- #1 `{price: 9, amount: 1}`, #2 `{price: 9, amount: 10}`, #3 `{price: 9, amount: 5}`,
- #4 `{price: 7, amount: 25}`,
- #5 `{price: 3, amount: 30}`, #6 `{price: 3, amount: 100}`,

Bids #1-#3 are ranked highest because of the higher price. Bid #1 was placed before bid #2 which was placed before bid #3 which is why they are ranked as they are. Same for bids #5 and #6, a bid's amount has no impact on its ranking, just its price and chronological order.

It is easy to follow how a clearing price is determined once we see the bids sorted in this manner. Now that the bids are sorted, we can simply start at the highest ranked bid and work our way down the list, keeping track of how many options we'd sell at this price. Once we reach our total available options, or the end of the list, we have found our clearing price. 

For example, using the bids listed above, if there are a total of 50 options for sale in the auction, we start at the top. With a clearing price of 9, we'd only sell 16 / 50 options, so we continue down the list, with a clearing price of 7, we'd only sell 41 / 50 options, so we continue down the list. With a clearing price of 3, we'd sell all 50 / 50 options, so we can stop here (in this example this is the last tier, but if there were a tier of bids with a price of 2 below, we'd still stop since we have hit the highest price to sell all 50). In this case, bid #5 will receive the remaining 9 options, it will receive a refund for the remaining 21 options from the bid, and bid #6 will become fully refundable. 

From the above example, we can draw a few conclusions. Bid #5 is what we refer to as the *clearing bid*. At the end of each auction, there will always be exactly 1 clearing bid. This is the ONLY bid that might recieve an amount of options less than what was bid for. All bids ranked above the clearing bid will recieve their full amount of options, and all bids below the clearing bid are fully refundable. To see this, notice how bid #5 receives 9 / 30 options; all bids above this (#1-#4) receive their full amount of options, and all bids below (#6) are fully refundable. Any of the bids above the clearing bid could recieve refunds if their price is above the clearing price.

This simple fact of knowing that there is only 1 clearing bid per auction is how we can efficiently track winning/losing bids once an auction has ended. Once the auction ends, the contract determines the clearing price and stores the price along with the nonce of the clearing bid (and how many options this bid receives). With this we can easily calculate how many options an OB received or how much they can refund on-the-fly when we need it. This is similar to how we compute LP positions on the fly instead of updating them each time a state transitions. 

To compute how many options an OB has received, we compare each of their bids to the clearing bid, if a bid is ranked above the clearing bid, it receives all of the options it bid for, if a bid ranked below the clearing bid, it does not receive any of the options it bid for, and if a bid is the clearing bid, we have already stored how many options this bid is supposed to receive (instead of its full amount). The same process is done for calculating how much an OB can refund (any bids below the clearing bid are fully refundable, any above the clearing bid are refundable for the price difference between the bid's price and the clearing price, and the clearing bid is refundable for the amount of options they did NOT receive).
