package models

import (
	"encoding/json"
	"time"

	"github.com/lib/pq"
)

func (lps *LiquidityProviderState) UnmarshalJSON(data []byte) error {
	// Auxiliary struct to map JSON keys
	aux := struct {
		VaultAddress    string `json:"vault_address"`
		Address         string `json:"address"`
		UnlockedBalance BigInt `json:"unlocked_balance"`
		LockedBalance   BigInt `json:"locked_balance"`
		StashedBalance  BigInt `json:"stashed_balance"`
		LatestBlock     uint64 `json:"latest_block"`
	}{}

	// Unmarshal into the auxiliary struct
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}

	// Copy data from aux to the original struct
	lps.VaultAddress = aux.VaultAddress
	lps.Address = aux.Address
	lps.UnlockedBalance = aux.UnlockedBalance
	lps.LockedBalance = aux.LockedBalance
	lps.StashedBalance = aux.StashedBalance
	lps.LatestBlock = aux.LatestBlock

	return nil
}
func (vs *VaultState) UnmarshalJSON(data []byte) error {
	// Auxiliary struct to map JSON keys
	aux := struct {
		CurrentRound          BigInt `json:"current_round"`
		CurrentRoundAddress   string `json:"current_round_address"`
		UnlockedBalance       BigInt `json:"unlocked_balance"`
		LockedBalance         BigInt `json:"locked_balance"`
		StashedBalance        BigInt `json:"stashed_balance"`
		Address               string `json:"address"`
		LatestBlock           BigInt `json:"latest_block"`
		DeploymentDate        uint64 `json:"deployment_date"`
		FossilClientAddress   string `json:"fossil_client_address"`
		EthAddress            string `json:"eth_address"`
		OptionRoundClassHash  string `json:"option_round_class_hash"`
		Alpha                 BigInt `json:"alpha"`
		StrikeLevel           BigInt `json:"strike_level"`
		AuctionRunTime        uint64 `json:"auction_duration"`
		OptionRunTime         uint64 `json:"round_duration"`
		RoundTransitionPeriod uint64 `json:"round_transition_period"`
	}{}

	// Unmarshal into the auxiliary struct
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}

	// Copy data from aux to the original struct
	vs.CurrentRound = aux.CurrentRound
	vs.CurrentRoundAddress = aux.CurrentRoundAddress
	vs.UnlockedBalance = aux.UnlockedBalance
	vs.LockedBalance = aux.LockedBalance
	vs.StashedBalance = aux.StashedBalance
	vs.Address = aux.Address
	vs.LatestBlock = aux.LatestBlock
	vs.DeploymentDate = aux.DeploymentDate
	vs.FossilClientAddress = aux.FossilClientAddress
	vs.EthAddress = aux.EthAddress
	vs.OptionRoundClassHash = aux.OptionRoundClassHash
	vs.Alpha = aux.Alpha
	vs.StrikeLevel = aux.StrikeLevel
	vs.AuctionRunTime = aux.AuctionRunTime
	vs.OptionRunTime = aux.OptionRunTime
	vs.RoundTransitionPeriod = aux.RoundTransitionPeriod

	return nil
}
func (b *Bid) UnmarshalJSON(data []byte) error {
	// Auxiliary struct to map JSON keys
	aux := struct {
		BuyerAddress string `json:"address"`
		RoundAddress string `json:"round_address"`
		BidID        string `json:"bid_id"`
		TreeNonce    uint64 `json:"tree_nonce"`
		Amount       BigInt `json:"amount"`
		Price        BigInt `json:"price"`
	}{}

	// Unmarshal into the auxiliary struct
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}

	// Copy data from aux to the original struct
	b.BuyerAddress = aux.BuyerAddress
	b.RoundAddress = aux.RoundAddress
	b.BidID = aux.BidID
	b.TreeNonce = aux.TreeNonce
	b.Amount = aux.Amount
	b.Price = aux.Price

	return nil
}

func (ql *QueuedLiquidity) UnmarshalJSON(data []byte) error {
	// Auxiliary struct to map JSON keys
	aux := struct {
		Address         string `json:"address"`
		RoundAddress    string `json:"round_address"`
		Bps             BigInt `json:"bps"`
		QueuedLiquidity BigInt `json:"queued_liquidity"`
	}{}

	// Unmarshal into the auxiliary struct
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}

	// Copy data from aux to the original struct
	ql.Address = aux.Address
	ql.RoundAddress = aux.RoundAddress
	ql.Bps = aux.Bps
	ql.QueuedLiquidity = aux.QueuedLiquidity

	return nil
}
func (ob *OptionBuyer) UnmarshalJSON(data []byte) error {
	// Auxiliary struct to map JSON keys
	aux := struct {
		Address           string `json:"address"`
		RoundAddress      string `json:"round_address"`
		MintableOptions   BigInt `json:"mintable_options"`
		HasMinted         bool   `json:"has_minted"`
		HasRefunded       bool   `json:"has_refunded"`
		RefundableOptions BigInt `json:"refundable_amount"`
		Bids              []*Bid `json:"bids"`
	}{}

	// Unmarshal into the auxiliary struct
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}

	// Copy data from aux to the original struct
	ob.Address = aux.Address
	ob.RoundAddress = aux.RoundAddress
	ob.MintableOptions = aux.MintableOptions
	ob.HasMinted = aux.HasMinted
	ob.HasRefunded = aux.HasRefunded
	ob.RefundableOptions = aux.RefundableOptions
	ob.Bids = aux.Bids

	return nil
}

func (or *OptionRound) UnmarshalJSON(data []byte) error {
	// Auxiliary struct to map JSON keys
	aux := struct {
		VaultAddress       string `json:"vault_address"`
		Address            string `json:"address"`
		RoundID            BigInt `json:"round_id"`
		CapLevel           BigInt `json:"cap_level"`
		AuctionStartDate   uint64 `json:"start_date"`
		AuctionEndDate     uint64 `json:"end_date"`
		OptionSettleDate   uint64 `json:"settlement_date"`
		StartingLiquidity  BigInt `json:"starting_liquidity"`
		QueuedLiquidity    BigInt `json:"queued_liquidity"`
		RemainingLiquidity BigInt `json:"remaining_liquidity"`
		AvailableOptions   BigInt `json:"available_options"`
		ClearingPrice      BigInt `json:"clearing_price"`
		SettlementPrice    BigInt `json:"settlement_price"`
		ReservePrice       BigInt `json:"reserve_price"`
		StrikePrice        BigInt `json:"strike_price"`
		OptionsSold        BigInt `json:"sold_options"`
		UnsoldLiquidity    BigInt `json:"unsold_liquidity"`
		RoundState         string `json:"state"`
		Premiums           BigInt `json:"premiums"`
		PayoutPerOption    BigInt `json:"payout_per_option"`
		DeploymentDate     uint64 `json:"deployment_date"`
	}{}

	// Unmarshal into the auxiliary struct
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}

	// Copy data from aux to the original struct
	or.VaultAddress = aux.VaultAddress
	or.Address = aux.Address
	or.RoundID = aux.RoundID
	or.CapLevel = aux.CapLevel
	or.AuctionStartDate = aux.AuctionStartDate
	or.AuctionEndDate = aux.AuctionEndDate
	or.OptionSettleDate = aux.OptionSettleDate
	or.StartingLiquidity = aux.StartingLiquidity
	or.QueuedLiquidity = aux.QueuedLiquidity
	or.RemainingLiquidity = aux.RemainingLiquidity
	or.AvailableOptions = aux.AvailableOptions
	or.ClearingPrice = aux.ClearingPrice
	or.SettlementPrice = aux.SettlementPrice
	or.ReservePrice = aux.ReservePrice
	or.StrikePrice = aux.StrikePrice
	or.OptionsSold = aux.OptionsSold
	or.UnsoldLiquidity = aux.UnsoldLiquidity
	or.RoundState = aux.RoundState
	or.Premiums = aux.Premiums
	or.PayoutPerOption = aux.PayoutPerOption
	or.DeploymentDate = aux.DeploymentDate

	return nil
}

func (e *Event) UnmarshalJSON(data []byte) error {
	// Auxiliary struct to map JSON keys
	aux := struct {
		From            string         `json:"from"`
		TransactionHash string         `json:"transaction_hash"`
		BlockNumber     uint64         `json:"block_number"`
		BlockHash       string         `json:"block_hash"`
		EventNonce      uint64         `json:"event_nonce"`
		VaultAddress    string         `json:"vault_address"`
		Timestamp       uint64         `json:"timestamp"`
		EventName       string         `json:"event_name"`
		EventKeys       pq.StringArray `json:"event_keys"`
		EventData       pq.StringArray `json:"event_data"`
	}{}

	// Unmarshal into the auxiliary struct
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}

	// Copy data from aux to the original struct
	e.From = aux.From
	e.TransactionHash = aux.TransactionHash
	e.BlockNumber = aux.BlockNumber
	e.VaultAddress = aux.VaultAddress
	e.Timestamp = aux.Timestamp
	e.EventNonce = aux.EventNonce
	e.BlockHash = aux.BlockHash
	e.EventName = aux.EventName
	e.EventKeys = aux.EventKeys
	e.EventData = aux.EventData

	return nil
}
func (sb *StarknetBlock) UnmarshalJSON(data []byte) error {
	// Auxiliary struct to map JSON keys
	aux := struct {
		BlockNumber uint64 `json:"block_number"`
		Timestamp   uint64 `json:"timestamp"`
		BlockHash   string `json:"block_hash"`
		ParentHash  string `json:"parent_hash"`
		Status      string `json:"status"`
	}{}

	// Unmarshal into the auxiliary struct
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}

	// Copy data from aux to the original struct
	sb.BlockNumber = aux.BlockNumber
	sb.Timestamp = aux.Timestamp
	sb.BlockHash = aux.BlockHash
	sb.ParentHash = aux.ParentHash
	sb.Status = aux.Status

	return nil
}

func (de *DriverEvent) UnmarshalJSON(data []byte) error {
	// Auxiliary struct to map JSON keys
	aux := struct {
		ID             int       `json:"id"`
		SequenceIndex  int64     `json:"sequence_index"`
		Type           string    `json:"type"`
		Timestamp      time.Time `json:"timestamp"`
		IsProcessed    bool      `json:"is_processed"`
		BlockHash      string    `json:"block_hash"`
		StartBlockHash string    `json:"start_block_hash"`
		EndBlockHash   string    `json:"end_block_hash"`
		VaultAddress   string    `json:"vault_address"`
	}{}

	// Unmarshal into the auxiliary struct
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}

	// Copy data from aux to the original struct
	de.ID = aux.ID
	de.SequenceIndex = aux.SequenceIndex
	de.Type = aux.Type
	de.Timestamp = aux.Timestamp
	de.IsProcessed = aux.IsProcessed
	de.BlockHash = aux.BlockHash
	de.StartBlockHash = aux.StartBlockHash
	de.EndBlockHash = aux.EndBlockHash
	de.VaultAddress = aux.VaultAddress

	return nil
}
