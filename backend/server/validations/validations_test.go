package validations

import (
	"pitchlake-backend/server/types"
	"testing"
)

func TestValidateSubscriptionMessage(t *testing.T) {
	tests := []struct {
		name    string
		message types.SubscriberMessage
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid subscription message",
			message: types.SubscriberMessage{
				Address:      "0x123456789012345678901234567890123456789012345678901234567890123",
				VaultAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabe",
				UserType:     "lp",
			},
			wantErr: false,
		},
		{
			name: "valid ob subscription message",
			message: types.SubscriberMessage{
				Address:      "0x123456789012345678901234567890123456789012345678901234567890123",
				VaultAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabc",
				UserType:     "ob",
			},
			wantErr: false,
		},
		{
			name: "missing address",
			message: types.SubscriberMessage{
				VaultAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabc",
				UserType:     "lp",
			},
			wantErr: true,
			errMsg:  "address is required",
		},
		{
			name: "missing vault address",
			message: types.SubscriberMessage{
				Address:  "0x123456789012345678901234567890123456789012345678901234567890123",
				UserType: "lp",
			},
			wantErr: true,
			errMsg:  "vault address is required",
		},
		{
			name: "missing user type",
			message: types.SubscriberMessage{
				Address:      "0x123456789012345678901234567890123456789012345678901234567890123",
				VaultAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabc",
			},
			wantErr: true,
			errMsg:  "user type is required",
		},
		{
			name: "invalid user type",
			message: types.SubscriberMessage{
				Address:      "0x123456789012345678901234567890123456789012345678901234567890123",
				VaultAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabc",
				UserType:     "invalid",
			},
			wantErr: true,
			errMsg:  "invalid user type: invalid, must be 'lp' or 'ob'",
		},
		{
			name: "invalid address format - no 0x prefix",
			message: types.SubscriberMessage{
				Address:      "123456789012345678901234567890123456789012345678901234567890123",
				VaultAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabc",
				UserType:     "lp",
			},
			wantErr: true,
			errMsg:  "invalid address format: 123456789012345678901234567890123456789012345678901234567890123",
		},
		{
			name: "invalid vault address format",
			message: types.SubscriberMessage{
				Address:      "0x123456789012345678901234567890123456789012345678901234567890123",
				VaultAddress: "0xabc",
				UserType:     "lp",
			},
			wantErr: true,
			errMsg:  "invalid vault address format: 0xabc",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateSubscriptionMessage(tt.message)
			if tt.wantErr {
				if err == nil {
					t.Errorf("ValidateSubscriptionMessage() expected error but got none")
					return
				}
				if err.Error() != tt.errMsg {
					t.Errorf("ValidateSubscriptionMessage() error = %v, want %v", err.Error(), tt.errMsg)
				}
			} else {
				if err != nil {
					t.Errorf("ValidateSubscriptionMessage() unexpected error = %v", err)
				}
			}
		})
	}
}

func TestValidateGasRequest(t *testing.T) {
	tests := []struct {
		name    string
		request types.SubscriberGasRequest
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid gas request - 12 min",
			request: types.SubscriberGasRequest{
				StartTimestamp: 1000,
				EndTimestamp:   2000,
				RoundDuration:  960,
			},
			wantErr: false,
		},
		{
			name: "valid gas request - 3 hour",
			request: types.SubscriberGasRequest{
				StartTimestamp: 1000,
				EndTimestamp:   2000,
				RoundDuration:  13200,
			},
			wantErr: false,
		},
		{
			name: "valid gas request - 30 day",
			request: types.SubscriberGasRequest{
				StartTimestamp: 1000,
				EndTimestamp:   2000,
				RoundDuration:  2631600,
			},
			wantErr: false,
		},
		{
			name: "missing start timestamp",
			request: types.SubscriberGasRequest{
				EndTimestamp:  2000,
				RoundDuration: 960,
			},
			wantErr: true,
			errMsg:  "start timestamp is required",
		},
		{
			name: "missing end timestamp",
			request: types.SubscriberGasRequest{
				StartTimestamp: 1000,
				RoundDuration:  960,
			},
			wantErr: true,
			errMsg:  "end timestamp is required",
		},
		{
			name: "start timestamp after end timestamp",
			request: types.SubscriberGasRequest{
				StartTimestamp: 2000,
				EndTimestamp:   1000,
				RoundDuration:  960,
			},
			wantErr: true,
			errMsg:  "start timestamp must be before end timestamp",
		},
		{
			name: "invalid round duration",
			request: types.SubscriberGasRequest{
				StartTimestamp: 1000,
				EndTimestamp:   2000,
				RoundDuration:  999,
			},
			wantErr: true,
			errMsg:  "invalid round duration: 999, must be 960, 13200, or 2631600",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateGasRequest(tt.request)
			if tt.wantErr {
				if err == nil {
					t.Errorf("ValidateGasRequest() expected error but got none")
					return
				}
				if err.Error() != tt.errMsg {
					t.Errorf("ValidateGasRequest() error = %v, want %v", err.Error(), tt.errMsg)
				}
			} else {
				if err != nil {
					t.Errorf("ValidateGasRequest() unexpected error = %v", err)
				}
			}
		})
	}
}

func TestValidateVaultRequest(t *testing.T) {
	tests := []struct {
		name    string
		request types.SubscriberVaultRequest
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid vault request - address update",
			request: types.SubscriberVaultRequest{
				UpdatedField: "address",
				UpdatedValue: "0x123456789012345678901234567890123456789012345678901234567890123",
			},
			wantErr: false,
		},
		{
			name: "missing updated field",
			request: types.SubscriberVaultRequest{
				UpdatedValue: "0x123456789012345678901234567890123456789012345678901234567890123",
			},
			wantErr: true,
			errMsg:  "updated field is required",
		},
		{
			name: "missing updated value",
			request: types.SubscriberVaultRequest{
				UpdatedField: "address",
			},
			wantErr: true,
			errMsg:  "updated value is required",
		},
		{
			name: "invalid field name",
			request: types.SubscriberVaultRequest{
				UpdatedField: "invalid_field",
				UpdatedValue: "0x123456789012345678901234567890123456789012345678901234567890123",
			},
			wantErr: true,
			errMsg:  "invalid field: invalid_field, must be 'address'",
		},
		{
			name: "invalid address format - no 0x prefix",
			request: types.SubscriberVaultRequest{
				UpdatedField: "address",
				UpdatedValue: "123456789012345678901234567890123456789012345678901234567890123",
			},
			wantErr: true,
			errMsg:  "invalid address format: 123456789012345678901234567890123456789012345678901234567890123",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateVaultRequest(tt.request)
			if tt.wantErr {
				if err == nil {
					t.Errorf("ValidateVaultRequest() expected error but got none")
					return
				}
				if err.Error() != tt.errMsg {
					t.Errorf("ValidateVaultRequest() error = %v, want %v", err.Error(), tt.errMsg)
				}
			} else {
				if err != nil {
					t.Errorf("ValidateVaultRequest() unexpected error = %v", err)
				}
			}
		})
	}
}
