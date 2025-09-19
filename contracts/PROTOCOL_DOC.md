# Protocol Documentation

Contents:

0. [XYZ](#xyz)

1. [Round Life Cycle](#round-life-cycle)

2. [Liquidity](#liquidity)

3. [Flow of Liquidity](#flow-of-liquidity)

4. [Transitioning Round States](#transitioning-round-states)

5. [Vault Contract](#vault-contract)

6. [Option Round Contract](#option-round-contract)

## XYZ

Vault contracts deploy Option Round contracts on their own. A vault's first round is deployed in the vault's constructor and each subsequent round is deployed when the previous round settles.

Vaults are responsible for managing positions for liquidity providers (LPs) and option rounds are responsible for managing the auctioning/minting/exercising of the options for option buyers (OBs). LPs interact with Vaults and OBs interact with Option Rounds. Anyone can be a liquidity provider and/or an option buyer.

When it is time for a round's auction to start or end, a bystander (anyone) must call the appropriate function on the vault to trigger the transition. For example, when it is time for a round's auction to start, anyone can call `Vault::start_auction()` to start the auction for the current round; the vault will then balance the liquidity as necessary and call `OptionRound::start_auction()`.
