#!/usr/bin/env ts-node

import { DB } from '../shared/db';

async function cleanupJobRequests() {
  console.log('🧹 Starting job requests cleanup...');
  
  // Set environment variables for local database connections
  process.env.FOSSIL_DB_URL = 'postgresql://fossil_user:fossil_password@localhost:5436/fossil';
  process.env.PITCHLAKE_DB_URL = 'postgresql://pitchlake_user:pitchlake_password@localhost:5437/pitchlake';
  
  try {
    const db = new DB();
    
    // Get current job requests count before cleanup
    const jobRequests = await db.getJobRequestsPitchlake();
    console.log(`Found ${jobRequests.length} job requests in the database`);
    
    if (jobRequests.length === 0) {
      console.log('✅ No job requests to clean up');
      await db.shutdown();
      return;
    }
    
    // Show what we're about to delete
    console.log('Job requests to be deleted:');
    jobRequests.forEach((job, index) => {
      console.log(`  ${index + 1}. Vault: ${job.vaultAddress}, Job ID: ${job.job_id}, Status: ${job.status}`);
    });
    
    // Clear all job requests
    const success = await db.clearAllJobRequests();
    
    if (success) {
      console.log('✅ Successfully cleared all job requests from the database');
    } else {
      console.log('❌ Failed to clear job requests');
      process.exit(1);
    }
    
    await db.shutdown();
    console.log('🎉 Job requests cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
  cleanupJobRequests();
}

export { cleanupJobRequests };
