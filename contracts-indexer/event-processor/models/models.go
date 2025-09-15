package models

import (
	"time"

	"github.com/lib/pq"
)

type Event struct {
	From            string         `json:"from"`
	TransactionHash string         `json:"transactionHash"`
	BlockNumber     uint64         `json:"blockNumber"`
	VaultAddress    string         `json:"vaultAddress"`
	Timestamp       uint64         `json:"timestamp"`
	EventNonce      uint64         `json:"eventNonce"`
	BlockHash       string         `json:"blockHash"`
	EventName       string         `json:"eventName"`
	EventKeys       pq.StringArray `json:"eventKeys"`
	EventData       pq.StringArray `json:"eventData"`
}

type Vault struct {
	BlockNumber     BigInt `json:"blockNumber"`
	UnlockedBalance BigInt `json:"unlockedBalance"`
	LockedBalance   BigInt `json:"lockedBalance"`
	StashedBalance  BigInt `json:"stashedBalance"`
}

type LiquidityProvider struct {
	VaultAddress    string `json:"vaultAddress"`
	Address         string `json:"address"`
	BlockNumber     BigInt `json:"blockNumber"`
	UnlockedBalance BigInt `json:"unlockedBalance"`
	LockedBalance   BigInt `json:"lockedBalance"`
	StashedBalance  BigInt `json:"stashedBalance"`
}

type OptionBuyer struct {
	Address           string `json:"address"`
	RoundAddress      string `json:"roundAddress"`
	MintableOptions   BigInt `json:"mintableOptions"`
	HasMinted         bool   `json:"hasMinted"`
	HasRefunded       bool   `json:"hasRefunded"`
	RefundableOptions BigInt `json:"refundableOptions"`
	Bids              []*Bid `json:"bids"`
}

type OptionRound struct {
	VaultAddress       string `json:"vaultAddress"`
	Address            string `json:"address"`
	RoundID            BigInt `json:"roundId"`
	CapLevel           BigInt `json:"capLevel"`
	AuctionStartDate   uint64 `json:"auctionStartDate"`
	AuctionEndDate     uint64 `json:"auctionEndDate"`
	OptionSettleDate   uint64 `json:"optionSettleDate"`
	StartingLiquidity  BigInt `json:"startingLiquidity"`
	QueuedLiquidity    BigInt `json:"queuedLiquidity"`
	RemainingLiquidity BigInt `json:"remainingLiquidity"`
	AvailableOptions   BigInt `json:"availableOptions"`
	ClearingPrice      BigInt `json:"clearingPrice"`
	SettlementPrice    BigInt `json:"settlementPrice"`
	ReservePrice       BigInt `json:"reservePrice"`
	StrikePrice        BigInt `json:"strikePrice"`
	OptionsSold        BigInt `json:"optionsSold"`
	UnsoldLiquidity    BigInt `json:"unsoldLiquidity"`
	RoundState         string `json:"roundState"`
	Premiums           BigInt `json:"premiums"`
	PayoutPerOption    BigInt `json:"payoutPerOption"`
	DeploymentDate     uint64 `json:"deploymentDate"`
}

type VaultState struct {
	CurrentRound          BigInt `json:"currentRoundId"`
	CurrentRoundAddress   string `json:"currentRoundAddress"`
	UnlockedBalance       BigInt `json:"unlockedBalance"`
	LockedBalance         BigInt `json:"lockedBalance"`
	StashedBalance        BigInt `json:"stashedBalance"`
	Address               string `json:"address"`
	LatestBlock           BigInt `json:"latestBlock"`
	DeploymentDate        uint64 `json:"deploymentDate"`
	FossilClientAddress   string `json:"fossilClientAddress"`
	EthAddress            string `json:"ethAddress"`
	OptionRoundClassHash  string `json:"optionRoundClassHash"`
	Alpha                 BigInt `json:"alpha"`
	StrikeLevel           BigInt `json:"strikeLevel"`
	AuctionRunTime        uint64 `json:"auctionRunTime"`
	OptionRunTime         uint64 `json:"optionRunTime"`
	RoundTransitionPeriod uint64 `json:"roundTransitionPeriod"`
}

type LiquidityProviderState struct {
	VaultAddress    string `json:"vaultAddress"`
	Address         string `json:"address"`
	UnlockedBalance BigInt `json:"unlockedBalance"`
	LockedBalance   BigInt `json:"lockedBalance"`
	StashedBalance  BigInt `json:"stashedBalance"`
	LatestBlock     uint64 `json:"latestBlock"`
}

type QueuedLiquidity struct {
	Address         string `json:"address"`
	RoundAddress    string `json:"roundAddress"`
	Bps             BigInt `json:"bps"`
	QueuedLiquidity BigInt `json:"queuedLiquidity"`
}
type Bid struct {
	BuyerAddress string `json:"address"`
	RoundAddress string `json:"roundAddress"`
	BidID        string `json:"bidId"`
	TreeNonce    uint64 `json:"treeNonce"`
	Amount       BigInt `json:"amount"`
	Price        BigInt `json:"price"`
}

type StarknetBlock struct {
	BlockNumber uint64 `json:"block_number"`
	Timestamp   uint64 `json:"timestamp"`
	BlockHash   string `json:"block_hash"`
	ParentHash  string `json:"parent_hash"`
	Status      string `json:"status"`
}

type DriverEvent struct {
	ID             int       `json:"id"`
	SequenceIndex  int64     `json:"sequence_index"`
	Type           string    `json:"type"`
	Timestamp      time.Time `json:"timestamp"`
	IsProcessed    bool      `json:"is_processed"`
	BlockHash      string    `json:"block_hash"`
	StartBlockHash string    `json:"start_block_hash"`
	EndBlockHash   string    `json:"end_block_hash"`
	VaultAddress   string    `json:"vault_address"`
}
