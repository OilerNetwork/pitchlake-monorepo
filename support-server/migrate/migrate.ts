import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env' });

const MIGRATION_TABLE_NAME = 'support_migrations';
const MIGRATIONS_DIR = '../migrations/pitchlake';

interface Migration {
  version: number;
  name: string;
  upSQL: string;
  downSQL: string;
}

class Migrator {
  private client: Client;

  constructor(connectionString: string) {
    const sslConfig = connectionString.includes("sslmode=disable")
      ? false
      : {rejectUnauthorized: false};
    this.client = new Client({ connectionString, ssl: sslConfig });
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async close(): Promise<void> {
    await this.client.end();
  }

  async createMigrationTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE_NAME} (
        version INTEGER PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await this.client.query(query);
  }

  async getAppliedMigrations(): Promise<Set<number>> {
    const query = `SELECT version FROM ${MIGRATION_TABLE_NAME} ORDER BY version`;
    const result = await this.client.query(query);
    return new Set(result.rows.map(row => row.version));
  }

  async loadMigrations(): Promise<Migration[]> {
    const migrations: Migration[] = [];

    // Check if migrations directory exists
    if (!fs.existsSync(MIGRATIONS_DIR)) {
      throw new Error(`Migrations directory '${MIGRATIONS_DIR}' not found`);
    }

    // Read all .sql files
    const files = fs.readdirSync(MIGRATIONS_DIR);
    const upFiles = files.filter(file => file.endsWith('.sql') && !file.includes('rollback') && !file.includes('down'));

    for (const upFile of upFiles) {
      // Extract version and name from filename
      const baseName = path.basename(upFile, '.sql');
      const versionStr = baseName.split('_')[0];
      const version = parseInt(versionStr);
      
      if (isNaN(version)) {
        console.log(`Warning: skipping file ${upFile} - invalid version format`);
        continue;
      }

      // Read up migration
      const upSQL = fs.readFileSync(path.join(MIGRATIONS_DIR, upFile), 'utf8');

      // Find corresponding down migration
      const downFile = upFile.replace('.sql', '_rollback.sql');
      const downFileAlt = upFile.replace('.sql', '_down.sql');
      let downSQL = '';
      
      if (fs.existsSync(path.join(MIGRATIONS_DIR, downFile))) {
        downSQL = fs.readFileSync(path.join(MIGRATIONS_DIR, downFile), 'utf8');
      } else if (fs.existsSync(path.join(MIGRATIONS_DIR, downFileAlt))) {
        downSQL = fs.readFileSync(path.join(MIGRATIONS_DIR, downFileAlt), 'utf8');
      }

      // Extract name from filename
      const name = baseName.substring(versionStr.length + 1);

      migrations.push({
        version,
        name,
        upSQL,
        downSQL
      });
    }

    // Sort migrations by version
    migrations.sort((a, b) => a.version - b.version);

    return migrations;
  }

  async up(): Promise<void> {
    console.log('Starting migrations...');

    await this.createMigrationTable();
    const applied = await this.getAppliedMigrations();
    const migrations = await this.loadMigrations();

    if (migrations.length === 0) {
      console.log('No migration files found');
      return;
    }

    let appliedCount = 0;
    for (const migration of migrations) {
      if (applied.has(migration.version)) {
        console.log(`Skipping: ${migration.name} (already applied)`);
        continue;
      }

      console.log(`Applying: ${migration.name}`);

      // Start transaction
      await this.client.query('BEGIN');

      try {
        // Execute migration
        await this.client.query(migration.upSQL);

        // Record migration
        await this.client.query(
          `INSERT INTO ${MIGRATION_TABLE_NAME} (version) VALUES ($1)`,
          [migration.version]
        );

        // Commit transaction
        await this.client.query('COMMIT');
        console.log(`Success: ${migration.name}`);
        appliedCount++;
      } catch (error) {
        await this.client.query('ROLLBACK');
        throw new Error(`Failed to execute migration ${migration.name}: ${error}`);
      }
    }

    if (appliedCount === 0) {
      console.log('Database is already up to date');
    } else {
      console.log(`Applied ${appliedCount} migrations successfully!`);
    }
  }

  async down(): Promise<void> {
    console.log('Starting rollback...');

    await this.createMigrationTable();
    const applied = await this.getAppliedMigrations();
    const migrations = await this.loadMigrations();

    if (migrations.length === 0) {
      console.log('No migration files found');
      return;
    }

    // Sort migrations in reverse order for rollback
    migrations.sort((a, b) => b.version - a.version);

    let rolledBackCount = 0;
    for (const migration of migrations) {
      if (!applied.has(migration.version)) {
        console.log(`Skipping: ${migration.name} (not applied)`);
        continue;
      }

      if (!migration.downSQL) {
        console.log(`Warning: No rollback script for ${migration.name}, skipping`);
        continue;
      }

      console.log(`Rolling back: ${migration.name}`);

      // Start transaction
      await this.client.query('BEGIN');

      try {
        // Execute rollback
        await this.client.query(migration.downSQL);

        // Remove migration record
        await this.client.query(
          `DELETE FROM ${MIGRATION_TABLE_NAME} WHERE version = $1`,
          [migration.version]
        );

        // Commit transaction
        await this.client.query('COMMIT');
        console.log(`Success: ${migration.name}`);
        rolledBackCount++;
      } catch (error) {
        await this.client.query('ROLLBACK');
        throw new Error(`Failed to execute rollback for ${migration.name}: ${error}`);
      }
    }

    if (rolledBackCount === 0) {
      console.log('No migrations to rollback');
    } else {
      console.log(`Rolled back ${rolledBackCount} migrations successfully!`);
    }
  }

  async status(): Promise<void> {
    console.log('Migration Status:');

    await this.createMigrationTable();
    const applied = await this.getAppliedMigrations();
    const migrations = await this.loadMigrations();

    if (migrations.length === 0) {
      console.log('No migration files found');
      return;
    }

    for (const migration of migrations) {
      const status = applied.has(migration.version) ? 'Applied' : 'Not Applied';
      console.log(`  ${status} - ${migration.name}`);
    }
  }

  async forceDrop(): Promise<void> {
    console.log('Dropping migration table...');
    
    const query = `DROP TABLE IF EXISTS ${MIGRATION_TABLE_NAME}`;
    await this.client.query(query);
    
    console.log('Migration table dropped successfully!');
  }
}

async function main() {
  const command = process.argv[2];

  if (!command || !['up', 'down', 'status'].includes(command)) {
    console.error('Usage: ts-node migrate.ts <command>');
    console.error('Commands: up, down, status');
    process.exit(1);
  }

  const dbURL = process.env.PITCHLAKE_DB_URL;
  if (!dbURL) {
    console.error('PITCHLAKE_DB_URL environment variable is not set');
    process.exit(1);
  }

  const migrator = new Migrator(dbURL);

  try {
    await migrator.connect();

    switch (command) {
      case 'up':
        await migrator.up();
        break;
      case 'down':
        await migrator.down();
        break;
      case 'status':
        await migrator.status();
        break;
      case 'force-drop':
        await migrator.forceDrop();
        break;
    }
  } catch (error) {
    console.error(`Migration failed: ${error}`);
    process.exit(1);
  } finally {
    await migrator.close();
  }
}

if (require.main === module) {
  main();
}
