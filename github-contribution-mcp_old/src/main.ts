import 'dotenv/config'; // Load environment variables from .env file first
import config from './config.js'; // Add .js extension
import logger from './logger.js'; // Add .js extension
import { setupServer } from './server.js'; // Add .js extension
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'; // Import Stdio transport

async function main() {
    logger.info('Starting github-contribution-mcp server...');
    logger.debug({ config }, 'Loaded configuration'); // Log loaded config (for debugging)

    try {
        // 1. Setup the MCP Server instance
        const server = setupServer();

        // 2. Instantiate the Stdio transport
        const transport = new StdioServerTransport();
        logger.info('Using Stdio transport.');

        // 3. Connect the server to the transport
        // This starts listening for MCP messages on stdin/stdout
        await server.connect(transport);

        logger.info('MCP Server connected to transport and ready.');

        // Keep the process alive, the server handles exit signals
        // process.stdin.resume(); // Not strictly necessary with stdio transport usually

    } catch (error) {
        logger.fatal({ err: error }, 'Failed to start or connect the MCP server');
        process.exit(1); // Exit with error code
    }
}

// Execute the main function
main().catch((error) => {
    // Catch any unhandled promise rejections during startup
    logger.fatal({ err: error }, 'Unhandled error during server startup');
    process.exit(1);
});