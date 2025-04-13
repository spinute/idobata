"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config"); // Load environment variables from .env file first
const config_1 = __importDefault(require("./config")); // Import configuration (partially implemented)
const logger_1 = __importDefault(require("./logger")); // Import logger (partially implemented)
const server_1 = require("./server"); // Import server setup function
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js"); // Import Stdio transport
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        logger_1.default.info('Starting github-contribution-mcp server...');
        logger_1.default.debug({ config: config_1.default }, 'Loaded configuration'); // Log loaded config (for debugging)
        try {
            // 1. Setup the MCP Server instance
            const server = (0, server_1.setupServer)();
            // 2. Instantiate the Stdio transport
            const transport = new stdio_js_1.StdioServerTransport();
            logger_1.default.info('Using Stdio transport.');
            // 3. Connect the server to the transport
            // This starts listening for MCP messages on stdin/stdout
            yield server.connect(transport);
            logger_1.default.info('MCP Server connected to transport and ready.');
            // Keep the process alive, the server handles exit signals
            // process.stdin.resume(); // Not strictly necessary with stdio transport usually
        }
        catch (error) {
            logger_1.default.fatal({ err: error }, 'Failed to start or connect the MCP server');
            process.exit(1); // Exit with error code
        }
    });
}
// Execute the main function
main().catch((error) => {
    // Catch any unhandled promise rejections during startup
    logger_1.default.fatal({ err: error }, 'Unhandled error during server startup');
    process.exit(1);
});
