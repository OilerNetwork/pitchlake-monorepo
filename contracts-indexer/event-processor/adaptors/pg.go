package adaptors

import (
	"log"
	"math/big"

	"event-processor/models"

	"github.com/NethermindEth/juno/core/felt"
)

type OptionRoundEvent string

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

func OptionRoundEmitted(event models.JunoEvent) OptionRoundEvent {
	optionRoundEvent := OptionRoundEvent(event.Data[1].String())
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
func PricingDataSet(event models.JunoEvent) (models.BigInt, models.BigInt, models.BigInt, string) {
	strikePrice := CombineFeltToBigInt(event.Data[3].Bytes(), event.Data[2].Bytes())
	capLevel := FeltToBigInt(event.Data[2].Bytes())
	reservePrice := CombineFeltToBigInt(event.Data[6].Bytes(), event.Data[5].Bytes())
	roundAddress := FeltToHexString(event.Data[7].Bytes())
	return strikePrice, capLevel, reservePrice, roundAddress
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
	accountQueuedNow := CombineFeltToBigInt(event.Data[3].Bytes(), event.Data[2].Bytes())
	vaultQueuedNow := CombineFeltToBigInt(event.Data[5].Bytes(), event.Data[4].Bytes())

	//Change this when using new cont
	accountQueuedBefore := CombineFeltToBigInt(event.Data[3].Bytes(), event.Data[2].Bytes())

	return lpAddress, bps, roundId, accountQueuedBefore, accountQueuedNow, vaultQueuedNow
}

func StashWithdrawn(event models.JunoEvent) (string, models.BigInt, models.BigInt) {
	lpAddress := FeltToHexString(event.Keys[1].Bytes())
	amount := CombineFeltToBigInt(event.Data[1].Bytes(), event.Data[0].Bytes())
	vaultStashed := CombineFeltToBigInt(event.Data[3].Bytes(), event.Data[2].Bytes())
	return lpAddress, amount, vaultStashed
}

func RoundDeployed(event models.JunoEvent) models.OptionRound {

	log.Printf("event from %v", event.From.String())
	log.Printf("event data %v", event.Data)
	log.Printf("event keys %v", event.Keys)
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

func AuctionStarted(event models.JunoEvent) (models.BigInt, models.BigInt, string) {

	startingLiquidity := CombineFeltToBigInt(event.Data[3].Bytes(), event.Data[2].Bytes())
	availableOptions := CombineFeltToBigInt(event.Data[5].Bytes(), event.Data[4].Bytes())
	roundAddress := FeltToHexString(event.Data[7].Bytes())
	return availableOptions, startingLiquidity, roundAddress
}

func AuctionEnded(event models.JunoEvent) (models.BigInt, models.BigInt, models.BigInt, uint64, models.BigInt, string) {
	optionsSold := CombineFeltToBigInt(event.Data[3].Bytes(), event.Data[2].Bytes())
	clearingPrice := CombineFeltToBigInt(event.Data[5].Bytes(), event.Data[4].Bytes())
	unsoldLiquidity := CombineFeltToBigInt(event.Data[7].Bytes(), event.Data[6].Bytes())
	clearingNonce := event.Data[8].Uint64()
	premiums := models.BigInt{Int: new(big.Int).Mul(optionsSold.Int, clearingPrice.Int)}
	roundAddress := FeltToHexString(event.Data[9].Bytes())
	return optionsSold, clearingPrice, unsoldLiquidity, clearingNonce, premiums, roundAddress
}

func OptionRoundSettled(event models.JunoEvent) (models.BigInt, models.BigInt, string) {
	settlementPrice := CombineFeltToBigInt(event.Data[3].Bytes(), event.Data[2].Bytes())
	payoutPerOption := CombineFeltToBigInt(event.Data[5].Bytes(), event.Data[4].Bytes())
	roundAddress := FeltToHexString(event.Data[7].Bytes())
	return settlementPrice, payoutPerOption, roundAddress
}

func BidPlaced(event models.JunoEvent) (models.Bid, models.OptionBuyer) {
	bidId := event.Data[0].String()
	bidAmount := CombineFeltToBigInt(event.Data[4].Bytes(), event.Data[3].Bytes())
	bidPrice := CombineFeltToBigInt(event.Data[6].Bytes(), event.Data[5].Bytes())
	treeNonce := event.Data[8].Uint64() - 1
	roundAddress := FeltToHexString(event.Data[8].Bytes())

	bid := models.Bid{
		BuyerAddress: FeltToHexString(event.Keys[1].Bytes()),
		BidID:        bidId,
		RoundAddress: roundAddress,
		Amount:       bidAmount,
		Price:        bidPrice,
		TreeNonce:    treeNonce,
	}

	buyer := models.OptionBuyer{
		Address:      FeltToHexString(event.Keys[1].Bytes()),
		RoundAddress: event.From.String(),
	}

	return bid, buyer
}

func BidUpdated(event models.JunoEvent) (string, models.BigInt, uint64, uint64, string) {
	bidId := event.Data[0].String()
	price := CombineFeltToBigInt(event.Data[4].Bytes(), event.Data[3].Bytes())
	treeNonceOld := event.Data[5].Uint64()
	treeNonceNew := event.Data[6].Uint64()
	roundAddress := FeltToHexString(event.Data[7].Bytes())
	return bidId, price, treeNonceOld, treeNonceNew, roundAddress
}

func OptionsMinted(event models.JunoEvent) (string, models.BigInt, string) {
	buyerAddress := FeltToHexString(event.Keys[3].Bytes())
	mintedAmount := CombineFeltToBigInt(event.Data[3].Bytes(), event.Data[2].Bytes())
	roundAddress := FeltToHexString(event.Data[4].Bytes())
	return buyerAddress, mintedAmount, roundAddress
}

func OptionsExercised(event models.JunoEvent) (string, models.BigInt, models.BigInt, models.BigInt, string) {
	buyerAddress := FeltToHexString(event.Keys[3].Bytes())
	totalOptionsExercised := CombineFeltToBigInt(event.Data[3].Bytes(), event.Data[2].Bytes())
	mintableOptionsExercised := CombineFeltToBigInt(event.Data[5].Bytes(), event.Data[4].Bytes())
	exercisedAmount := CombineFeltToBigInt(event.Data[7].Bytes(), event.Data[6].Bytes())
	roundAddress := FeltToHexString(event.Data[9].Bytes())
	return buyerAddress, totalOptionsExercised, mintableOptionsExercised, exercisedAmount, roundAddress
}

func UnusedBidsRefunded(event models.JunoEvent) (string, models.BigInt, string) {
	buyerAddress := FeltToHexString(event.Keys[3].Bytes())
	refundedAmount := CombineFeltToBigInt(event.Data[3].Bytes(), event.Data[2].Bytes())
	roundAddress := FeltToHexString(event.Data[4].Bytes())
	return buyerAddress, refundedAmount, roundAddress
}
