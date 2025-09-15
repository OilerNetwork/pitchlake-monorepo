import * as dotenv from "dotenv";
import { setupLogger } from './shared/logger';
import * as cron from 'node-cron';
import { UnconfirmedTWAPsRunner } from "./services/unconfirmed-twaps";

dotenv.config()
import { runTWAPUpdate } from "./services/scheduler/scheduler";
const logger = setupLogger('Main');


class ArchitectureSupportServer {

  

  constructor() {
  }

  async start(): Promise<void> {
    const {
      CRON_SCHEDULE_STATE,
      CRON_SCHEDULE_TWAP,
  } = process.env;
  
  // Validate environment variables and set up services
  
    const runner = new UnconfirmedTWAPsRunner();
    try {
      logger.info('Starting Architecture Support Server...');

      // Start all services, if a scheduled job should auto run on startup, add it here
      await Promise.all([
        runner.initialize()
      ]);

      logger.info('All services started successfully');
      runner.startListening();

      //Schedule cron
      cron.schedule(CRON_SCHEDULE_TWAP as string, runTWAPUpdate() );
      

      // Handle graceful shutdown
      this.setupGracefulShutdown();
    } catch (error) {
      logger.error('Failed to start server:', error);
      throw error;
    }
  }

  private setupGracefulShutdown(): void {
    const cleanup = async () => {
      logger.info('Shutting down Architecture Support Server...');
    
      try {
        // Stop all cron jobs gracefully using built-in getTasks()
        const tasks = cron.getTasks();
        for (const [id, task] of tasks) {
          task.stop();
        }
        logger.info(`Stopped ${tasks.size} cron jobs`);
        
        await Promise.all([
        ]);
        
        logger.info('Cleanup complete, exiting');
        process.exit(0);
      } catch (error) {
        logger.error('Error during cleanup:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
  }
}




// Start the server
const server = new ArchitectureSupportServer();
server.start().catch((error) => {
  logger.error('Fatal error starting server:', error);
  process.exit(1);
}); 