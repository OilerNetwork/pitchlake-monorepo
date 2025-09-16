import { Pool } from "pg";


const pool =
  new Pool({
    connectionString: process.env.FOSSIL_DB_URL,
    ssl: {
      rejectUnauthorized: false, // For testing purposes; consider proper SSL config in production
    },
  });

export default pool;
