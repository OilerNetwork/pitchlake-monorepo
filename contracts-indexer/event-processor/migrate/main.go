package main

import (
	"log"
	"os"
	"strings"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/joho/godotenv"
)

func main() {
	if len(os.Args) < 2 {
		log.Fatal("Usage: go run main.go <command>\nCommands: up, down, status, force-drop")
	}

	// Load .env file if it exists
	if err := godotenv.Load("../.env"); err != nil {
		// .env file not found, continue with system environment variables
	}

	command := os.Args[1]

	// Get database URL from environment variable
	dbURL := os.Getenv("PITCHLAKE_DB_URL")
	if dbURL == "" {
		log.Fatal("PITCHLAKE_DB_URL environment variable is not set")
	}

	// Add custom migration table name to the database URL
	// This ensures each module has its own migration table
	if strings.Contains(dbURL, "?") {
		dbURL += "&"
	} else {
		dbURL += "?"
	}
	dbURL += "x-migrations-table=processor_migrations"

	// Create migrate instance
	m, err := migrate.New(
		"file://../database/migrations",
		dbURL,
	)
	if err != nil {
		log.Fatalf("Failed to create migrator: %v", err)
	}
	defer m.Close()

	switch command {
	case "up":
		if err := m.Up(); err != nil {
			if err == migrate.ErrNoChange {
				log.Println("Database is already up to date")
			} else {
				log.Fatalf("Migration failed: %v", err)
			}
		} else {
			log.Println("Migrations applied successfully!")
		}
	case "down":
		if err := m.Down(); err != nil {
			if err == migrate.ErrNoChange {
				log.Println("No migrations to rollback")
			} else {
				log.Fatalf("Rollback failed: %v", err)
			}
		} else {
			log.Println("Migrations rolled back successfully!")
		}
	case "status":
		version, dirty, err := m.Version()
		if err != nil {
			if err == migrate.ErrNilVersion {
				log.Println("No migrations have been applied")
			} else {
				log.Fatalf("Status check failed: %v", err)
			}
		} else {
			if dirty {
				log.Printf("Migration version %d is in a dirty state", version)
			} else {
				log.Printf("Current migration version: %d", version)
			}
		}
	case "force-drop":
		log.Println("Dropping migration table...")
		if err := m.Drop(); err != nil {
			log.Fatalf("Failed to drop migration table: %v", err)
		}
		log.Println("Migration table dropped successfully!")
	default:
		log.Fatal("Invalid command. Use: up, down, status, or force-drop")
	}
}
