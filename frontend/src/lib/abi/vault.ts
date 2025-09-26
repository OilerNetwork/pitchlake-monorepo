export const ABI = [
  {
    "type": "impl",
    "name": "VaultImpl",
    "interface_name": "pitch_lake::vault::interface::IVault"
  },
  {
    "type": "struct",
    "name": "core::integer::u256",
    "members": [
      {
        "name": "low",
        "type": "core::integer::u128"
      },
      {
        "name": "high",
        "type": "core::integer::u128"
      }
    ]
  },
  {
    "type": "struct",
    "name": "pitch_lake::vault::interface::Params",
    "members": [
      {
        "name": "twap",
        "type": "(core::integer::u64, core::integer::u64)"
      },
      {
        "name": "max_return",
        "type": "(core::integer::u64, core::integer::u64)"
      },
      {
        "name": "reserve_price",
        "type": "(core::integer::u64, core::integer::u64)"
      }
    ]
  },
  {
    "type": "struct",
    "name": "pitch_lake::vault::interface::OffchainJobRequest",
    "members": [
      {
        "name": "program_id",
        "type": "core::felt252"
      },
      {
        "name": "vault_address",
        "type": "core::starknet::contract_address::ContractAddress"
      },
      {
        "name": "params",
        "type": "pitch_lake::vault::interface::Params"
      }
    ]
  },
  {
    "type": "struct",
    "name": "core::array::Span::<core::felt252>",
    "members": [
      {
        "name": "snapshot",
        "type": "@core::array::Array::<core::felt252>"
      }
    ]
  },
  {
    "type": "struct",
    "name": "pitch_lake::option_round::interface::PricingData",
    "members": [
      {
        "name": "strike_price",
        "type": "core::integer::u256"
      },
      {
        "name": "cap_level",
        "type": "core::integer::u128"
      },
      {
        "name": "reserve_price",
        "type": "core::integer::u256"
      }
    ]
  },
  {
    "type": "struct",
    "name": "pitch_lake::option_round::interface::PricingDataSet",
    "members": [
      {
        "name": "pricing_data",
        "type": "pitch_lake::option_round::interface::PricingData"
      }
    ]
  },
  {
    "type": "struct",
    "name": "pitch_lake::option_round::interface::AuctionStarted",
    "members": [
      {
        "name": "starting_liquidity",
        "type": "core::integer::u256"
      },
      {
        "name": "options_available",
        "type": "core::integer::u256"
      }
    ]
  },
  {
    "type": "struct",
    "name": "pitch_lake::option_round::interface::BidPlaced",
    "members": [
      {
        "name": "account",
        "type": "core::starknet::contract_address::ContractAddress"
      },
      {
        "name": "bid_id",
        "type": "core::felt252"
      },
      {
        "name": "amount",
        "type": "core::integer::u256"
      },
      {
        "name": "price",
        "type": "core::integer::u256"
      },
      {
        "name": "bid_tree_nonce_now",
        "type": "core::integer::u64"
      }
    ]
  },
  {
    "type": "struct",
    "name": "pitch_lake::option_round::interface::BidUpdated",
    "members": [
      {
        "name": "account",
        "type": "core::starknet::contract_address::ContractAddress"
      },
      {
        "name": "bid_id",
        "type": "core::felt252"
      },
      {
        "name": "price_increase",
        "type": "core::integer::u256"
      },
      {
        "name": "bid_tree_nonce_before",
        "type": "core::integer::u64"
      },
      {
        "name": "bid_tree_nonce_now",
        "type": "core::integer::u64"
      }
    ]
  },
  {
    "type": "struct",
    "name": "pitch_lake::option_round::interface::AuctionEnded",
    "members": [
      {
        "name": "options_sold",
        "type": "core::integer::u256"
      },
      {
        "name": "clearing_price",
        "type": "core::integer::u256"
      },
      {
        "name": "unsold_liquidity",
        "type": "core::integer::u256"
      },
      {
        "name": "clearing_bid_tree_nonce",
        "type": "core::integer::u64"
      }
    ]
  },
  {
    "type": "struct",
    "name": "pitch_lake::option_round::interface::OptionRoundSettled",
    "members": [
      {
        "name": "settlement_price",
        "type": "core::integer::u256"
      },
      {
        "name": "payout_per_option",
        "type": "core::integer::u256"
      }
    ]
  },
  {
    "type": "struct",
    "name": "pitch_lake::option_round::interface::OptionsExercised",
    "members": [
      {
        "name": "account",
        "type": "core::starknet::contract_address::ContractAddress"
      },
      {
        "name": "total_options_exercised",
        "type": "core::integer::u256"
      },
      {
        "name": "mintable_options_exercised",
        "type": "core::integer::u256"
      },
      {
        "name": "exercised_amount",
        "type": "core::integer::u256"
      }
    ]
  },
  {
    "type": "struct",
    "name": "pitch_lake::option_round::interface::UnusedBidsRefunded",
    "members": [
      {
        "name": "account",
        "type": "core::starknet::contract_address::ContractAddress"
      },
      {
        "name": "refunded_amount",
        "type": "core::integer::u256"
      }
    ]
  },
  {
    "type": "struct",
    "name": "pitch_lake::option_round::interface::OptionsMinted",
    "members": [
      {
        "name": "account",
        "type": "core::starknet::contract_address::ContractAddress"
      },
      {
        "name": "minted_amount",
        "type": "core::integer::u256"
      }
    ]
  },
  {
    "type": "enum",
    "name": "pitch_lake::option_round::interface::OptionRoundEvent",
    "variants": [
      {
        "name": "PricingDataSet",
        "type": "pitch_lake::option_round::interface::PricingDataSet"
      },
      {
        "name": "AuctionStarted",
        "type": "pitch_lake::option_round::interface::AuctionStarted"
      },
      {
        "name": "BidPlaced",
        "type": "pitch_lake::option_round::interface::BidPlaced"
      },
      {
        "name": "BidUpdated",
        "type": "pitch_lake::option_round::interface::BidUpdated"
      },
      {
        "name": "AuctionEnded",
        "type": "pitch_lake::option_round::interface::AuctionEnded"
      },
      {
        "name": "OptionRoundSettled",
        "type": "pitch_lake::option_round::interface::OptionRoundSettled"
      },
      {
        "name": "OptionsExercised",
        "type": "pitch_lake::option_round::interface::OptionsExercised"
      },
      {
        "name": "UnusedBidsRefunded",
        "type": "pitch_lake::option_round::interface::UnusedBidsRefunded"
      },
      {
        "name": "OptionsMinted",
        "type": "pitch_lake::option_round::interface::OptionsMinted"
      }
    ]
  },
  {
    "type": "interface",
    "name": "pitch_lake::vault::interface::IVault",
    "items": [
      {
        "type": "function",
        "name": "get_alpha",
        "inputs": [],
        "outputs": [
          {
            "type": "core::integer::u128"
          }
        ],
        "state_mutability": "view"
      },
      {
        "type": "function",
        "name": "get_strike_level",
        "inputs": [],
        "outputs": [
          {
            "type": "core::integer::i128"
          }
        ],
        "state_mutability": "view"
      },
      {
        "type": "function",
        "name": "get_eth_address",
        "inputs": [],
        "outputs": [
          {
            "type": "core::starknet::contract_address::ContractAddress"
          }
        ],
        "state_mutability": "view"
      },
      {
        "type": "function",
        "name": "get_verifier_address",
        "inputs": [],
        "outputs": [
          {
            "type": "core::starknet::contract_address::ContractAddress"
          }
        ],
        "state_mutability": "view"
      },
      {
        "type": "function",
        "name": "get_deployment_block",
        "inputs": [],
        "outputs": [
          {
            "type": "core::integer::u64"
          }
        ],
        "state_mutability": "view"
      },
      {
        "type": "function",
        "name": "get_round_transition_duration",
        "inputs": [],
        "outputs": [
          {
            "type": "core::integer::u64"
          }
        ],
        "state_mutability": "view"
      },
      {
        "type": "function",
        "name": "get_auction_duration",
        "inputs": [],
        "outputs": [
          {
            "type": "core::integer::u64"
          }
        ],
        "state_mutability": "view"
      },
      {
        "type": "function",
        "name": "get_round_duration",
        "inputs": [],
        "outputs": [
          {
            "type": "core::integer::u64"
          }
        ],
        "state_mutability": "view"
      },
      {
        "type": "function",
        "name": "get_current_round_id",
        "inputs": [],
        "outputs": [
          {
            "type": "core::integer::u64"
          }
        ],
        "state_mutability": "view"
      },
      {
        "type": "function",
        "name": "get_round_address",
        "inputs": [
          {
            "name": "option_round_id",
            "type": "core::integer::u64"
          }
        ],
        "outputs": [
          {
            "type": "core::starknet::contract_address::ContractAddress"
          }
        ],
        "state_mutability": "view"
      },
      {
        "type": "function",
        "name": "get_program_id",
        "inputs": [],
        "outputs": [
          {
            "type": "core::felt252"
          }
        ],
        "state_mutability": "view"
      },
      {
        "type": "function",
        "name": "get_proving_delay",
        "inputs": [],
        "outputs": [
          {
            "type": "core::integer::u64"
          }
        ],
        "state_mutability": "view"
      },
      {
        "type": "function",
        "name": "get_vault_total_balance",
        "inputs": [],
        "outputs": [
          {
            "type": "core::integer::u256"
          }
        ],
        "state_mutability": "view"
      },
      {
        "type": "function",
        "name": "get_vault_locked_balance",
        "inputs": [],
        "outputs": [
          {
            "type": "core::integer::u256"
          }
        ],
        "state_mutability": "view"
      },
      {
        "type": "function",
        "name": "get_vault_unlocked_balance",
        "inputs": [],
        "outputs": [
          {
            "type": "core::integer::u256"
          }
        ],
        "state_mutability": "view"
      },
      {
        "type": "function",
        "name": "get_vault_stashed_balance",
        "inputs": [],
        "outputs": [
          {
            "type": "core::integer::u256"
          }
        ],
        "state_mutability": "view"
      },
      {
        "type": "function",
        "name": "get_vault_queued_bps",
        "inputs": [],
        "outputs": [
          {
            "type": "core::integer::u128"
          }
        ],
        "state_mutability": "view"
      },
      {
        "type": "function",
        "name": "get_account_total_balance",
        "inputs": [
          {
            "name": "account",
            "type": "core::starknet::contract_address::ContractAddress"
          }
        ],
        "outputs": [
          {
            "type": "core::integer::u256"
          }
        ],
        "state_mutability": "view"
      },
      {
        "type": "function",
        "name": "get_account_locked_balance",
        "inputs": [
          {
            "name": "account",
            "type": "core::starknet::contract_address::ContractAddress"
          }
        ],
        "outputs": [
          {
            "type": "core::integer::u256"
          }
        ],
        "state_mutability": "view"
      },
      {
        "type": "function",
        "name": "get_account_unlocked_balance",
        "inputs": [
          {
            "name": "account",
            "type": "core::starknet::contract_address::ContractAddress"
          }
        ],
        "outputs": [
          {
            "type": "core::integer::u256"
          }
        ],
        "state_mutability": "view"
      },
      {
        "type": "function",
        "name": "get_account_stashed_balance",
        "inputs": [
          {
            "name": "account",
            "type": "core::starknet::contract_address::ContractAddress"
          }
        ],
        "outputs": [
          {
            "type": "core::integer::u256"
          }
        ],
        "state_mutability": "view"
      },
      {
        "type": "function",
        "name": "get_account_queued_bps",
        "inputs": [
          {
            "name": "account",
            "type": "core::starknet::contract_address::ContractAddress"
          }
        ],
        "outputs": [
          {
            "type": "core::integer::u128"
          }
        ],
        "state_mutability": "view"
      },
      {
        "type": "function",
        "name": "get_request_to_start_first_round",
        "inputs": [],
        "outputs": [
          {
            "type": "pitch_lake::vault::interface::OffchainJobRequest"
          }
        ],
        "state_mutability": "view"
      },
      {
        "type": "function",
        "name": "get_request_to_settle_round",
        "inputs": [],
        "outputs": [
          {
            "type": "pitch_lake::vault::interface::OffchainJobRequest"
          }
        ],
        "state_mutability": "view"
      },
      {
        "type": "function",
        "name": "deposit",
        "inputs": [
          {
            "name": "amount",
            "type": "core::integer::u256"
          },
          {
            "name": "account",
            "type": "core::starknet::contract_address::ContractAddress"
          }
        ],
        "outputs": [
          {
            "type": "core::integer::u256"
          }
        ],
        "state_mutability": "external"
      },
      {
        "type": "function",
        "name": "withdraw",
        "inputs": [
          {
            "name": "amount",
            "type": "core::integer::u256"
          }
        ],
        "outputs": [
          {
            "type": "core::integer::u256"
          }
        ],
        "state_mutability": "external"
      },
      {
        "type": "function",
        "name": "queue_withdrawal",
        "inputs": [
          {
            "name": "bps",
            "type": "core::integer::u128"
          }
        ],
        "outputs": [],
        "state_mutability": "external"
      },
      {
        "type": "function",
        "name": "withdraw_stash",
        "inputs": [
          {
            "name": "account",
            "type": "core::starknet::contract_address::ContractAddress"
          }
        ],
        "outputs": [
          {
            "type": "core::integer::u256"
          }
        ],
        "state_mutability": "external"
      },
      {
        "type": "function",
        "name": "start_auction",
        "inputs": [],
        "outputs": [
          {
            "type": "core::integer::u256"
          }
        ],
        "state_mutability": "external"
      },
      {
        "type": "function",
        "name": "end_auction",
        "inputs": [],
        "outputs": [
          {
            "type": "(core::integer::u256, core::integer::u256)"
          }
        ],
        "state_mutability": "external"
      },
      {
        "type": "function",
        "name": "fossil_callback",
        "inputs": [
          {
            "name": "job_request",
            "type": "core::array::Span::<core::felt252>"
          },
          {
            "name": "result",
            "type": "core::array::Span::<core::felt252>"
          }
        ],
        "outputs": [
          {
            "type": "core::integer::u256"
          }
        ],
        "state_mutability": "external"
      },
      {
        "type": "function",
        "name": "emit_option_round_event",
        "inputs": [
          {
            "name": "round_id",
            "type": "core::integer::u64"
          },
          {
            "name": "option_round_event",
            "type": "pitch_lake::option_round::interface::OptionRoundEvent"
          }
        ],
        "outputs": [],
        "state_mutability": "external"
      }
    ]
  },
  {
    "type": "struct",
    "name": "pitch_lake::vault::interface::ConstructorArgs",
    "members": [
      {
        "name": "verifier_address",
        "type": "core::starknet::contract_address::ContractAddress"
      },
      {
        "name": "eth_address",
        "type": "core::starknet::contract_address::ContractAddress"
      },
      {
        "name": "option_round_class_hash",
        "type": "core::starknet::class_hash::ClassHash"
      },
      {
        "name": "alpha",
        "type": "core::integer::u128"
      },
      {
        "name": "strike_level",
        "type": "core::integer::i128"
      },
      {
        "name": "round_transition_duration",
        "type": "core::integer::u64"
      },
      {
        "name": "auction_duration",
        "type": "core::integer::u64"
      },
      {
        "name": "round_duration",
        "type": "core::integer::u64"
      },
      {
        "name": "program_id",
        "type": "core::felt252"
      },
      {
        "name": "proving_delay",
        "type": "core::integer::u64"
      }
    ]
  },
  {
    "type": "constructor",
    "name": "constructor",
    "inputs": [
      {
        "name": "args",
        "type": "pitch_lake::vault::interface::ConstructorArgs"
      }
    ]
  },
  {
    "type": "event",
    "name": "pitch_lake::vault::contract::Vault::Deposit",
    "kind": "struct",
    "members": [
      {
        "name": "account",
        "type": "core::starknet::contract_address::ContractAddress",
        "kind": "key"
      },
      {
        "name": "amount",
        "type": "core::integer::u256",
        "kind": "data"
      },
      {
        "name": "account_unlocked_balance_now",
        "type": "core::integer::u256",
        "kind": "data"
      },
      {
        "name": "vault_unlocked_balance_now",
        "type": "core::integer::u256",
        "kind": "data"
      }
    ]
  },
  {
    "type": "event",
    "name": "pitch_lake::vault::contract::Vault::Withdrawal",
    "kind": "struct",
    "members": [
      {
        "name": "account",
        "type": "core::starknet::contract_address::ContractAddress",
        "kind": "key"
      },
      {
        "name": "amount",
        "type": "core::integer::u256",
        "kind": "data"
      },
      {
        "name": "account_unlocked_balance_now",
        "type": "core::integer::u256",
        "kind": "data"
      },
      {
        "name": "vault_unlocked_balance_now",
        "type": "core::integer::u256",
        "kind": "data"
      }
    ]
  },
  {
    "type": "event",
    "name": "pitch_lake::vault::contract::Vault::WithdrawalQueued",
    "kind": "struct",
    "members": [
      {
        "name": "account",
        "type": "core::starknet::contract_address::ContractAddress",
        "kind": "key"
      },
      {
        "name": "bps",
        "type": "core::integer::u128",
        "kind": "data"
      },
      {
        "name": "round_id",
        "type": "core::integer::u64",
        "kind": "data"
      },
      {
        "name": "account_queued_liquidity_before",
        "type": "core::integer::u256",
        "kind": "data"
      },
      {
        "name": "account_queued_liquidity_now",
        "type": "core::integer::u256",
        "kind": "data"
      },
      {
        "name": "vault_queued_liquidity_now",
        "type": "core::integer::u256",
        "kind": "data"
      }
    ]
  },
  {
    "type": "event",
    "name": "pitch_lake::vault::contract::Vault::StashWithdrawn",
    "kind": "struct",
    "members": [
      {
        "name": "account",
        "type": "core::starknet::contract_address::ContractAddress",
        "kind": "key"
      },
      {
        "name": "amount",
        "type": "core::integer::u256",
        "kind": "data"
      },
      {
        "name": "vault_stashed_balance_now",
        "type": "core::integer::u256",
        "kind": "data"
      }
    ]
  },
  {
    "type": "event",
    "name": "pitch_lake::vault::contract::Vault::OptionRoundDeployed",
    "kind": "struct",
    "members": [
      {
        "name": "round_id",
        "type": "core::integer::u64",
        "kind": "data"
      },
      {
        "name": "address",
        "type": "core::starknet::contract_address::ContractAddress",
        "kind": "data"
      },
      {
        "name": "auction_start_date",
        "type": "core::integer::u64",
        "kind": "data"
      },
      {
        "name": "auction_end_date",
        "type": "core::integer::u64",
        "kind": "data"
      },
      {
        "name": "option_settlement_date",
        "type": "core::integer::u64",
        "kind": "data"
      },
      {
        "name": "pricing_data",
        "type": "pitch_lake::option_round::interface::PricingData",
        "kind": "data"
      }
    ]
  },
  {
    "type": "struct",
    "name": "pitch_lake::vault::interface::L1Data",
    "members": [
      {
        "name": "twap",
        "type": "core::integer::u256"
      },
      {
        "name": "max_return",
        "type": "core::integer::u128"
      },
      {
        "name": "reserve_price",
        "type": "core::integer::u256"
      }
    ]
  },
  {
    "type": "event",
    "name": "pitch_lake::vault::contract::Vault::FossilCallbackSuccess",
    "kind": "struct",
    "members": [
      {
        "name": "l1_data",
        "type": "pitch_lake::vault::interface::L1Data",
        "kind": "data"
      },
      {
        "name": "timestamp",
        "type": "core::integer::u64",
        "kind": "data"
      }
    ]
  },
  {
    "type": "event",
    "name": "pitch_lake::vault::contract::Vault::OptionRoundEmitted",
    "kind": "struct",
    "members": [
      {
        "name": "round_id",
        "type": "core::integer::u64",
        "kind": "data"
      },
      {
        "name": "event",
        "type": "pitch_lake::option_round::interface::OptionRoundEvent",
        "kind": "data"
      }
    ]
  },
  {
    "type": "event",
    "name": "pitch_lake::vault::contract::Vault::Event",
    "kind": "enum",
    "variants": [
      {
        "name": "Deposit",
        "type": "pitch_lake::vault::contract::Vault::Deposit",
        "kind": "nested"
      },
      {
        "name": "Withdrawal",
        "type": "pitch_lake::vault::contract::Vault::Withdrawal",
        "kind": "nested"
      },
      {
        "name": "WithdrawalQueued",
        "type": "pitch_lake::vault::contract::Vault::WithdrawalQueued",
        "kind": "nested"
      },
      {
        "name": "StashWithdrawn",
        "type": "pitch_lake::vault::contract::Vault::StashWithdrawn",
        "kind": "nested"
      },
      {
        "name": "OptionRoundDeployed",
        "type": "pitch_lake::vault::contract::Vault::OptionRoundDeployed",
        "kind": "nested"
      },
      {
        "name": "FossilCallbackSuccess",
        "type": "pitch_lake::vault::contract::Vault::FossilCallbackSuccess",
        "kind": "nested"
      },
      {
        "name": "OptionRoundEmitted",
        "type": "pitch_lake::vault::contract::Vault::OptionRoundEmitted",
        "kind": "nested"
      }
    ]
  }
] as const;
