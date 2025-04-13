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
exports.setupServer = setupServer;
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js"); // Keep specific path for Server
// Import types and schemas from the path found in the example
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const logger_1 = __importDefault(require("./logger"));
const upsertFile_1 = __importDefault(require("./handlers/upsertFile"));
const updatePr_1 = __importDefault(require("./handlers/updatePr"));
// Tool definitions based on system.md
const toolDefinitions = [
    {
        name: 'upsert_file_and_commit',
        description: 'Creates or updates a specified Markdown file in a branch and commits the changes. Automatically creates the branch and a draft pull request if they don\'t exist.',
        inputSchema: {
            type: 'object',
            properties: {
                filePath: { type: 'string', description: 'Required. Relative path from GITHUB_TARGET_DIRECTORY. Must end with .md.' },
                branchName: { type: 'string', description: 'Required. Working branch name (e.g., user123-topic-revamp-timestamp).' },
                content: { type: 'string', description: 'Required. Full content of the file.' },
                commitMessage: { type: 'string', description: 'Required. Commit message.' },
            },
            required: ['filePath', 'branchName', 'content', 'commitMessage'],
        },
        annotations: {
            title: 'Update File and Commit',
            readOnlyHint: false,
            destructiveHint: false, // Overwrites, but not purely destructive
            idempotentHint: false, // New commit each time
            openWorldHint: false, // GitHub interaction
        }
    },
    {
        name: 'update_pr_description',
        description: 'Updates the description (body) of the open pull request associated with the specified branch.',
        inputSchema: {
            type: 'object',
            properties: {
                branchName: { type: 'string', description: 'Required. The target working branch name.' },
                description: { type: 'string', description: 'Required. The new pull request description.' },
            },
            required: ['branchName', 'description'],
        },
        annotations: {
            title: 'Update Pull Request Description',
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: true, // Same description yields same result
            openWorldHint: false, // GitHub interaction
        }
    }
];
function setupServer() {
    logger_1.default.info('Setting up MCP server...');
    // Use require for JSON to avoid potential ESM issues with package.json
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const packageJson = require('../package.json');
    const serverVersion = packageJson.version || '0.1.0';
    const server = new index_js_1.Server({
        name: 'github-contribution-mcp',
        version: serverVersion,
    }, {
        capabilities: {
            tools: {}, // Indicate tool support
        },
    });
    // Register tools/list handler
    // Assuming ListToolsRequestSchema is implicitly handled or imported differently
    server.setRequestHandler(types_js_1.ListToolsRequestSchema, (request) => __awaiter(this, void 0, void 0, function* () {
        logger_1.default.info('Received tools/list request.');
        return {
            tools: toolDefinitions,
        };
    }));
    // Register tools/call handler
    // Assuming CallToolRequestSchema is implicitly handled or imported differently
    server.setRequestHandler(types_js_1.CallToolRequestSchema, (request) => __awaiter(this, void 0, void 0, function* () {
        const { name, arguments: args } = request.params;
        logger_1.default.info({ toolName: name, args }, `Received tools/call request for tool: ${name}`);
        try {
            switch (name) {
                case 'upsert_file_and_commit':
                    // Delegate to the specific handler
                    // Type assertion for arguments might be needed depending on handler signature
                    return yield (0, upsertFile_1.default)(args); // TODO: Define specific argument types
                case 'update_pr_description':
                    // Delegate to the specific handler
                    return yield (0, updatePr_1.default)(args); // TODO: Define specific argument types
                default:
                    logger_1.default.warn(`Unknown tool requested: ${name}`);
                    throw new types_js_1.McpError(types_js_1.ErrorCode.MethodNotFound, `Tool '${name}' not found.`); // Restore MCP error
            }
        }
        catch (error) {
            logger_1.default.error({ err: error, toolName: name }, `Error executing tool '${name}'`);
            // Ensure errors are returned in the expected CallToolResult format
            return {
                isError: true,
                content: [{ type: 'text', text: `Error executing tool ${name}: ${error.message}` }], // Keep structure, type checked now
            };
        }
    }));
    logger_1.default.info(`MCP server v${serverVersion} setup complete. Registered tool handlers.`);
    return server;
}
