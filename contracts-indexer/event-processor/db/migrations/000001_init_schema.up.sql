
CREATE TABLE "Liquidity_Providers"
(
    address character varying NOT NULL,
    vault_address character varying NOT NULL,
    stashed_balance numeric(78,0),
    locked_balance numeric(78,0),
    unlocked_balance numeric(78,0),
    latest_block numeric(78,0),
    CONSTRAINT "Liquidity_Providers_pkey" PRIMARY KEY (address, vault_address)
);


CREATE TABLE "Liquidity_Providers_Historic"
(
    address character varying NOT NULL,
    vault_address character varying NOT NULL,
    stashed_balance numeric(78,0),
    locked_balance numeric(78,0),
    unlocked_balance numeric(78,0),
    block_number numeric(78,0),
     CONSTRAINT "Liquidity_Providers_Historic_pkey" PRIMARY KEY (address, vault_address,block_number)
);
CREATE TABLE "Option_Rounds"
(
    address character varying NOT NULL,
    available_options numeric(78,0) DEFAULT 0,
    clearing_price numeric(78,0),
    settlement_price numeric(78,0),
    reserve_price numeric(78,0),
    strike_price numeric(78,0),
    sold_options numeric(78,0),
    deployment_date numeric(78,0),
    state character varying(10),
    premiums numeric(78,0),
    vault_address character varying,
    round_id numeric(78,0),
    cap_level numeric(78,0),
    unsold_liquidity numeric(78,0),
    starting_liquidity numeric(78,0),
    queued_liquidity numeric(78,0),
    remaining_liquidity numeric(78,0),
    payout_per_option numeric(78,0),
    start_date numeric(78,0),
    end_date numeric(78,0),
    settlement_date numeric(78,0),
    CONSTRAINT "Option_Rounds_pkey" PRIMARY KEY (address)
);


-- Table: public.Queued_Liquidity

CREATE TABLE "Queued_Liquidity"
(
    address character varying NOT NULL,
    queued_liquidity numeric(78,0) NOT NULL,
    bps numeric(78,0) NOT NULL,
    round_address character varying,
    CONSTRAINT lp_round_address PRIMARY KEY (address, round_address),
    CONSTRAINT round_address FOREIGN KEY (round_address)
        REFERENCES public."Option_Rounds" (address) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT VALID
);


-- Table: public.VaultStates

CREATE TABLE "VaultStates"
(
    unlocked_balance numeric(78,0),
    locked_balance numeric(78,0),
    current_round numeric(78,0),
    current_round_address character varying,
    stashed_balance numeric(78,0),
    address character varying NOT NULL,
    latest_block numeric(78,0),
    fossil_client_address character varying,
    eth_address character varying,
    option_round_class_hash character varying,
    alpha numeric(78,0),
    strike_level numeric(78,0),
    round_transition_period numeric(78,0),
    auction_duration numeric(78,0),
    round_duration numeric(78,0),
    deployment_date numeric(78,0),
    
    CONSTRAINT "VaultState_pkey" PRIMARY KEY (address)
);

CREATE TABLE "Vault_Historic"
(
    unlocked_balance numeric(78,0),
    locked_balance numeric(78,0),
    stashed_balance numeric(78,0),
    address character varying NOT NULL,
    block_number numeric(78,0),
    CONSTRAINT "Vault_Historic_pkey" PRIMARY KEY (address,block_number)
);


-- Table: public.Option_Buyers


CREATE TABLE "Option_Buyers"
(
    address character varying NOT NULL,
    round_address character varying NOT NULL,
    has_minted boolean NOT NULL DEFAULT false,
    has_refunded boolean NOT NULL DEFAULT false,
    mintable_options numeric(78,0),
    refundable_amount numeric(78,0),
    CONSTRAINT buyer_round PRIMARY KEY (address, round_address)
);


-- Table: public.Bids


CREATE TABLE "Bids"
(
    buyer_address character varying,
    round_address character varying,
    bid_id character varying,
    tree_nonce numeric,
    amount numeric,
    price numeric,
    CONSTRAINT round_address_bid_id PRIMARY KEY (round_address, bid_id)
);









