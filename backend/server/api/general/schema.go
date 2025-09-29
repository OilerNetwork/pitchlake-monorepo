package general

import (
	"log"
	"sync"

	"pitchlake-backend/server/types"

	"github.com/jackc/pgx/v5/pgxpool"
)

type SubscribersWithLock struct {
	List map[*types.SubscriberGas]struct{}
	mux  sync.Mutex
}

type GeneralRouter struct {
	subscriberMessageBuffer int
	Subscribers             SubscribersWithLock
	log                     *log.Logger
	pool                    pgxpool.Pool
}
