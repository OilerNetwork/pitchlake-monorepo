package constants

import "time"

// Database timeouts
const (
	DatabaseTimeout = 5 * time.Second
)

// HTTP server timeouts
const (
	HTTPReadTimeout  = 10 * time.Second
	HTTPWriteTimeout = 10 * time.Second
	HTTPStartTimeout = 10 * time.Second
)

// Block duration constants (in seconds)
const (
	BlockDurationTwelveMin  = 960      // 12 minutes
	BlockDurationThreeHour  = 13200    // 3 hours
	BlockDurationThirtyDay  = 2631600  // 30 days
)

// Round duration constants (in seconds)
const (
	RoundDuration16Minutes = 960
	RoundDuration3Hours    = 13200
	RoundDuration30Days    = 2631600
)

// Sampling rate constants
const (
	SamplingRate16Minutes = 4
	SamplingRate3Hours    = 5
	SamplingRate30Days    = 40
	DefaultSamplingRate   = 1
)

// Other timeouts
const (
	MockFossilTolerance = 60 * time.Second
	MockFossilTimeout   = 30 * time.Second
)

// Mock fossil constants
const (
	MockFossilToleranceSeconds = 60
	MockFossilTimeoutSeconds   = 30
)

// Bit operations
const (
	Uint256BitSize = 256
)
