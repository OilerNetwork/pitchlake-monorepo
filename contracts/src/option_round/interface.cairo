use pitch_lake::types::Bid;
use starknet::ContractAddress;
// An enum for each state an option round can be in
#[derive(Default, Copy, Drop, Serde, PartialEq, starknet::Store)]
pub enum OptionRoundState {
    #[default]
    Open, // Accepting deposits, waiting for auction to start
    Auctioning, // Auction is on going, accepting bids
    Running, // Auction has ended, waiting for option round expiry date to settle
    Settled // Option round has settled, remaining liquidity has rolled over to the next round
}

#[derive(Drop, Serde, PartialEq)]
pub enum OptionRoundEvent {
    PricingDataSet: PricingDataSet,
    AuctionStarted: AuctionStarted,
    BidPlaced: BidPlaced,
    BidUpdated: BidUpdated,
    AuctionEnded: AuctionEnded,
    OptionRoundSettled: OptionRoundSettled,
    OptionsExercised: OptionsExercised,
    UnusedBidsRefunded: UnusedBidsRefunded,
    OptionsMinted: OptionsMinted,
}
#[derive(Drop, Serde, PartialEq)]
pub struct PricingDataSet {
    event_name:"PricingDataSet",
    pub pricing_data: PricingData,
}

// @dev Emitted when the auction starts
// @member starting_liquidity: The liquidity locked at the start of the auction
// @member options_available: The max number of options that can sell in the auction
#[derive(Drop, Serde, PartialEq)]
pub struct AuctionStarted {
    event_name:"AuctionStarted",
    pub starting_liquidity: u256,
    pub options_available: u256,
}

// @dev Emitted when the auction ends
// @member clearing_price: The calculated price per option after the auction
// @member options_sold: The number of options that sold in the auction
// @member unsold_liquidity: The amount of liquidity that was not sold in the auction
#[derive(Drop, Serde, PartialEq)]
pub struct AuctionEnded {
    event_name:"AuctionEnded",
    pub options_sold: u256,
    pub clearing_price: u256,
    pub unsold_liquidity: u256,
    pub clearing_bid_tree_nonce: u64,
}

// @dev Emitted when the round settles
// @member payout_per_option: The exercisable amount for 1 option
// @member settlement_price: The basefee TWAP used to settle the round
#[derive(Drop, Serde, PartialEq)]
pub struct OptionRoundSettled {
    event_name:"OptionRoundSettled",
    pub settlement_price: u256,
    pub payout_per_option: u256,
}

// @dev Emitted when a bid is placed
// @member account: The account that placed the bid
// @member bid_id: The bid's identifier
// @member amount: The max amount of options the account is bidding for
// @member price: The max price per option the account is bidding for
// @member account_bid_nonce_now: The amount of bids the account has placed now
// @member tree_bid_nonce_now: The bid tree's nonce now
#[derive(Drop, Serde, PartialEq)]
pub struct BidPlaced {
    #[key]
    pub account: ContractAddress,
    pub event_name:"BidPlaced",
    pub bid_id: felt252,
    pub amount: u256,
    pub price: u256,
    pub bid_tree_nonce_now: u64,
}

// @dev Emitted when a bid is updated
// @member account: The account that updated the bid
// @member bid_id: The bid's identifier
// @member price_increase: The bid's price increase amount
// @member tree_bid_nonce_now: The nonce of the bid tree now
#[derive(Drop, Serde, PartialEq)]
pub struct BidUpdated {
    #[key]
    pub account: ContractAddress,
    pub event_name:"BidUpdated",
    pub bid_id: felt252,
    pub price_increase: u256,
    pub bid_tree_nonce_before: u64,
    pub bid_tree_nonce_now: u64,
}

// @dev Emitted when an account mints option ERC-20 tokens
// @member account: The account that minted the options
// @member minted_amount: The amount of options minted
#[derive(Drop, Serde, PartialEq)]
pub struct OptionsMinted {
    #[key]
    pub account: ContractAddress,
    pub event_name:"OptionsMinted",
    pub minted_amount: u256,
}

// @dev Emitted when an accounts unused bids are refunded
// @param account: The account that's bids were refuned
// @param refunded_amount: The amount refunded
#[derive(Drop, Serde, PartialEq)]
pub struct UnusedBidsRefunded {
    #[key]
    pub account: ContractAddress,
    pub event_name:"UnusedBidsRefunded",
    pub refunded_amount: u256,
}

// @dev Emitted when an account exercises their options
// @param account: The account that exercised the options
// @param total_options_exercised: The total number of options exercised
// @param mintable_options_exercised: The number of options exercised that the caller could have
// minted @param exercised_amount: The amount transferred
#[derive(Drop, Serde, PartialEq)]
pub struct OptionsExercised {
    #[key]
    pub account: ContractAddress,
    pub event_name:"OptionsExercised",
    pub total_options_exercised: u256,
    pub mintable_options_exercised: u256,
    pub exercised_amount: u256,
}


// @dev Option pricing data, needed for a round's auction to start
#[derive(Default, PartialEq, Copy, Drop, Serde, starknet::Store)]
pub struct PricingData {
    pub event_name:"PricingData",
    pub strike_price: u256,
    pub cap_level: u128,
    pub reserve_price: u256,
}

#[derive(Drop, Serde)]
pub struct ConstructorArgs {
    pub vault_address: ContractAddress,
    pub round_id: u64,
    pub pricing_data: PricingData,
    pub round_transition_duration: u64,
    pub auction_duration: u64,
    pub round_duration: u64,
}

// The interface for an option round contract
#[starknet::interface]
pub trait IOptionRound<TContractState> {
    /// Reads ///

    /// Round details

    // @dev The address of the vault that deployed this round
    fn get_vault_address(self: @TContractState) -> ContractAddress;

    // @dev This round's id
    fn get_round_id(self: @TContractState) -> u64;

    // @dev The state of this round
    fn get_state(self: @TContractState) -> OptionRoundState;

    // @dev Get the round's deployment date
    fn get_deployment_date(self: @TContractState) -> u64;

    // @dev Get the date the auction can start
    fn get_auction_start_date(self: @TContractState) -> u64;

    // @dev Get the date the auction can end
    fn get_auction_end_date(self: @TContractState) -> u64;

    // @dev Get the date the round can settle
    fn get_option_settlement_date(self: @TContractState) -> u64;

    // @dev The minimum price per option
    fn get_reserve_price(self: @TContractState) -> u256;

    // @dev The strike price for this round in wei
    fn get_strike_price(self: @TContractState) -> u256;

    // @dev The percentage points (BPS) above the TWAP to cap the payout per option
    // @note E.g. 3333 translates to a capped payout of 33.33% above the strike price
    fn get_cap_level(self: @TContractState) -> u128;

    // @dev The total ETH locked at the start of the auction
    fn get_starting_liquidity(self: @TContractState) -> u256;

    // @dev The total number of options available in the auction
    fn get_options_available(self: @TContractState) -> u256;

    // @dev The total options sold after in the auction
    fn get_options_sold(self: @TContractState) -> u256;

    // @dev The total liquidity not sold in the auction (no longer collateral)
    fn get_unsold_liquidity(self: @TContractState) -> u256;

    // @dev The total liquidity sold in the auction (collateral)
    fn get_sold_liquidity(self: @TContractState) -> u256;

    // @dev The price paid for each option after the auction ends
    fn get_clearing_price(self: @TContractState) -> u256;

    // @dev The number of options sold * the price paid for each option
    fn get_total_premium(self: @TContractState) -> u256;

    // @dev The price used to settle the option round
    fn get_settlement_price(self: @TContractState) -> u256;

    // @dev The total amount of ETH paid out to option buyersr
    fn get_total_payout(self: @TContractState) -> u256;

    /// Bids

    // @dev The nonce of the entire bid tree
    fn get_bid_tree_nonce(self: @TContractState) -> u64;

    // @dev The details of a bid
    // @param bid_id: The id of the bid
    fn get_bid_details(self: @TContractState, bid_id: felt252) -> Bid;

    /// Accounts

    // @dev The bid ids for an account
    // @param account: The account to get bid ids for
    fn get_account_bids(self: @TContractState, account: ContractAddress) -> Array<Bid>;

    // @dev The number of bids an account has placed
    // @param account: The account to get the number of bids for
    fn get_account_bid_nonce(self: @TContractState, account: ContractAddress) -> u64;

    // @dev The amount of ETH an account can refund after the auction ends
    // @param account: The account to get the refundable balance for
    fn get_account_refundable_balance(self: @TContractState, account: ContractAddress) -> u256;

    // @dev The amount of options that can be minted for an account after the auction ends,
    // 0 if the account already minted
    // @param account: The account to get the mintable options for
    fn get_account_mintable_options(self: @TContractState, account: ContractAddress) -> u256;

    // @dev The amount of options an account can still mint, plus the amount of option
    // ERC-20 tokens they already own
    // @param account: The account to get the options balance for
    fn get_account_total_options(self: @TContractState, account: ContractAddress) -> u256;

    // @dev The total payout an account can receive from exercising their options
    // @dev account: The account to get the payout for
    fn get_account_payout_balance(self: @TContractState, account: ContractAddress) -> u256;

    /// Writes ///

    /// State transitions

    // @dev Set pricing data for the first round to start
    // @note When one round settles, the same l1 data is used to deploy the next, meaning this
    // function is only used to set the first round's pricing data
    fn set_pricing_data(ref self: TContractState, pricing_data: PricingData);

    // @dev Start the round's auction, return the options available in the auction
    // @param starting_liquidity: The total amount of ETH being locked in the auction
    fn start_auction(ref self: TContractState, starting_liquidity: u256) -> u256;

    // @dev End the round's auction, return the price paid for each option and number
    // of options sold
    fn end_auction(ref self: TContractState) -> (u256, u256);

    // @dev Settle the round, return the total payout for all of the (sold) options
    fn settle_round(ref self: TContractState, settlement_price: u256) -> u256;

    /// Account functions

    // @dev The caller places a bid in the auction
    // @param amount: The max amount of options being bid for
    // @param price: The max price per option being bid
    // @return The bid struct just created
    fn place_bid(ref self: TContractState, amount: u256, price: u256) -> Bid;

    // @dev The caller increases one of their bids in the auction
    // @param bid_id: The id of the bid to update
    // @param price_increase: The amount to increase the bid's price by
    // @return The updated bid struct
    fn update_bid(ref self: TContractState, bid_id: felt252, price_increase: u256) -> Bid;

    // @dev Refund the account's unused bids from the auction
    // @param account: The account to refund the unused bids for
    // @return The amount of refundable ETH transferred
    fn refund_unused_bids(ref self: TContractState, account: ContractAddress) -> u256;

    // @dev The caller exercises all of their options (mintable and already minted)
    // @param account: The account to exercise the options for
    // @return The amount of exerciseable ETH transferred
    fn exercise_options(ref self: TContractState) -> u256;

    // Convert options won from auction into erc20 tokens
    fn mint_options(ref self: TContractState) -> u256;
}
