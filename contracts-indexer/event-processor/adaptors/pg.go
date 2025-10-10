package adaptors

import (
	"log"
	"math/big"

	"event-processor/models"

	"github.com/NethermindEth/juno/core/felt"
)

func GetJunoEvent(event models.Event) models.JunoEvent {

	From, _ := felt.NewFromString[felt.Felt](event.VaultAddress)

	// Convert EventData array to felt array
	Data := make([]*felt.Felt, len(event.EventData))
	for i, data := range event.EventData {
		Data[i], _ = felt.NewFromString[felt.Felt](data)
	}

	// Convert EventKeys array to felt array
	Keys := make([]*felt.Felt, len(event.EventKeys))
	for i, key := range event.EventKeys {
		Keys[i], _ = felt.NewFromString[felt.Felt](key)
	}

	junoEvent := models.JunoEvent{
		From: From,
		Data: Data,
		Keys: Keys,
	}
	return junoEvent
}

func OptionRoundEmittedEventName(event models.JunoEvent) string {
	optionRoundEvent := event.Data[1].String()
	optionRoundEvent, err := DecodeEventNameRound(optionRoundEvent)
	if err != nil {
		log.Printf("Error decoding option round event name %v", err)
		return ""
	}
	return optionRoundEvent
}
func ContractDeployed(event models.JunoEvent) (string, string, string, models.BigInt, models.BigInt, uint64, uint64, uint64) {

	fossilClientAddress := FeltToHexString(event.Data[5].Bytes())
	ethAddress := FeltToHexString(event.Data[6].Bytes())
	optionRoundClassHash := FeltToHexString(event.Data[7].Bytes())
	alpha := FeltToBigInt(event.Data[8].Bytes())
	strikeLevel := FeltToBigInt(event.Data[9].Bytes())
	roundTransitionDuration := event.Data[10].Uint64()
	auctionDuration := event.Data[11].Uint64()
	roundDuration := event.Data[12].Uint64()
	return fossilClientAddress,
		ethAddress,
		optionRoundClassHash,
		alpha,
		strikeLevel,
		roundTransitionDuration,
		auctionDuration,
		roundDuration
}
func PricingDataSet(event models.JunoEvent) (models.BigInt, models.BigInt, models.BigInt) {
	strikePrice := CombineFeltToBigInt(event.Data[4].Bytes(), event.Data[3].Bytes())
	capLevel := FeltToBigIntReverse(event.Data[5].Bytes())
	reservePrice := CombineFeltToBigInt(event.Data[7].Bytes(), event.Data[6].Bytes())
	return strikePrice, capLevel, reservePrice
}
func DepositOrWithdraw(event models.JunoEvent) (string, models.BigInt, models.BigInt) {
	lpAddress := FeltToHexString(event.Keys[1].Bytes())
	lpUnlocked := CombineFeltToBigInt(event.Data[3].Bytes(), event.Data[2].Bytes())
	vaultUnlocked := CombineFeltToBigInt(event.Data[5].Bytes(), event.Data[4].Bytes())
	return lpAddress, lpUnlocked, vaultUnlocked
}

func WithdrawalQueued(event models.JunoEvent) (string, models.BigInt, uint64, models.BigInt, models.BigInt, models.BigInt) {
	lpAddress := FeltToHexString(event.Keys[1].Bytes())
	bps := FeltToBigInt(event.Data[0].Bytes())
	roundId := event.Data[1].Uint64()
	accountQueuedBefore := CombineFeltToBigInt(event.Data[3].Bytes(), event.Data[2].Bytes())
	accountQueuedNow := CombineFeltToBigInt(event.Data[5].Bytes(), event.Data[4].Bytes())
	vaultQueuedNow := CombineFeltToBigInt(event.Data[7].Bytes(), event.Data[6].Bytes())

	return lpAddress, bps, roundId, accountQueuedBefore, accountQueuedNow, vaultQueuedNow
}

func StashWithdrawn(event models.JunoEvent) (string, models.BigInt, models.BigInt) {
	lpAddress := FeltToHexString(event.Keys[1].Bytes())
	amount := CombineFeltToBigInt(event.Data[1].Bytes(), event.Data[0].Bytes())
	vaultStashed := CombineFeltToBigInt(event.Data[3].Bytes(), event.Data[2].Bytes())
	return lpAddress, amount, vaultStashed
}

func RoundDeployed(event models.JunoEvent) models.OptionRound {

	vaultAddress :=
		FeltToHexString(event.From.Bytes())
	roundId := FeltToBigInt(event.Data[0].Bytes())
	roundAddress := FeltToHexString(event.Data[1].Bytes())
	startingBlock := event.Data[2].Uint64()
	endingBlock := event.Data[3].Uint64()
	settlementDate := event.Data[4].Uint64()
	strikePrice := CombineFeltToBigInt(event.Data[6].Bytes(), event.Data[5].Bytes())
	capLevel := FeltToBigInt(event.Data[7].Bytes())
	reservePrice := CombineFeltToBigInt(event.Data[9].Bytes(), event.Data[8].Bytes())
	optionRound := models.OptionRound{
		RoundID:          roundId,
		Address:          roundAddress,
		VaultAddress:     vaultAddress,
		AuctionStartDate: startingBlock,
		AuctionEndDate:   endingBlock,
		OptionSettleDate: settlementDate,
		StrikePrice:      strikePrice,
		CapLevel:         capLevel,
		ReservePrice:     reservePrice,
		RoundState:       "Open",
	}
	return optionRound

}

func AuctionStarted(event models.JunoEvent) (models.BigInt, models.BigInt) {

	startingLiquidity := CombineFeltToBigInt(event.Data[4].Bytes(), event.Data[3].Bytes())
	availableOptions := CombineFeltToBigInt(event.Data[6].Bytes(), event.Data[5].Bytes())
	return availableOptions, startingLiquidity
}

func AuctionEnded(event models.JunoEvent) (models.BigInt, models.BigInt, models.BigInt, uint64, models.BigInt) {
	optionsSold := CombineFeltToBigInt(event.Data[4].Bytes(), event.Data[3].Bytes())
	clearingPrice := CombineFeltToBigInt(event.Data[6].Bytes(), event.Data[5].Bytes())
	unsoldLiquidity := CombineFeltToBigInt(event.Data[8].Bytes(), event.Data[7].Bytes())
	clearingNonce := event.Data[9].Uint64()
	premiums := models.BigInt{Int: new(big.Int).Mul(optionsSold.Int, clearingPrice.Int)}
	return optionsSold, clearingPrice, unsoldLiquidity, clearingNonce, premiums
}

func OptionRoundSettled(event models.JunoEvent) (models.BigInt, models.BigInt) {
	settlementPrice := CombineFeltToBigInt(event.Data[4].Bytes(), event.Data[3].Bytes())
	payoutPerOption := CombineFeltToBigInt(event.Data[6].Bytes(), event.Data[5].Bytes())
	return settlementPrice, payoutPerOption
}

func BidPlaced(event models.JunoEvent) (models.Bid, models.OptionBuyer) {
	obAddress := FeltToHexString(event.Data[3].Bytes())
	bidId := FeltToHexString(event.Data[4].Bytes())
	bidAmount := CombineFeltToBigInt(event.Data[6].Bytes(), event.Data[5].Bytes())
	bidPrice := CombineFeltToBigInt(event.Data[8].Bytes(), event.Data[7].Bytes())
	treeNonce := event.Data[9].Uint64()

	bid := models.Bid{
		BuyerAddress: obAddress,
		BidID:        bidId,
		RoundAddress: "",
		Amount:       bidAmount,
		Price:        bidPrice,
		TreeNonce:    treeNonce,
	}

	buyer := models.OptionBuyer{
		Address:      obAddress,
		RoundAddress: "",
	}

	return bid, buyer
}

func BidUpdated(event models.JunoEvent) (string, models.BigInt, uint64, uint64) {
	bidId := event.Data[4].String()
	priceIncrease := CombineFeltToBigInt(event.Data[6].Bytes(), event.Data[5].Bytes())
	treeNonceOld := event.Data[7].Uint64()
	treeNonceNew := event.Data[8].Uint64()

	return bidId, priceIncrease, treeNonceOld, treeNonceNew
}

func OptionsMinted(event models.JunoEvent) (string, models.BigInt) {
	obAddress := FeltToHexString(event.Data[3].Bytes())
	mintedAmount := CombineFeltToBigInt(event.Data[5].Bytes(), event.Data[4].Bytes())
	return obAddress, mintedAmount
}

func OptionsExercised(event models.JunoEvent) (string, models.BigInt, models.BigInt, models.BigInt) {
	obAddress := FeltToHexString(event.Data[3].Bytes())
	totalOptionsExercised := CombineFeltToBigInt(event.Data[5].Bytes(), event.Data[4].Bytes())
	mintableOptionsExercised := CombineFeltToBigInt(event.Data[7].Bytes(), event.Data[6].Bytes())
	exercisedAmount := CombineFeltToBigInt(event.Data[9].Bytes(), event.Data[8].Bytes())
	return obAddress, totalOptionsExercised, mintableOptionsExercised, exercisedAmount
}

func UnusedBidsRefunded(event models.JunoEvent) (string, models.BigInt) {
	buyerAddress := FeltToHexString(event.Data[3].Bytes())
	refundedAmount := CombineFeltToBigInt(event.Data[4].Bytes(), event.Data[3].Bytes())
	return buyerAddress, refundedAmount
}
