import { Server } from '@modelcontextprotocol/sdk/server/index.js'; // Keep specific path for Server
// Import types and schemas from the path found in the example
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ListToolsResult,
    CallToolResult,
    McpError,
    ErrorCode,
    CallToolRequest,
    ListToolsRequest,
    Tool // Try 'Tool' instead of 'ToolDefinition'
} from '@modelcontextprotocol/sdk/types.js';
import logger from './logger.js'; // Add .js extension
import config from './config.js'; // Add .js extension
import handleUpsertFile from './handlers/upsertFile.js'; // Add .js extension
import handleUpdatePr from './handlers/updatePr.js'; // Add .js extension
import fs from 'fs'; // Import fs module
import { fileURLToPath } from 'url'; // Needed to get __dirname in ESM
import path from 'path'; // Needed for path operations

// Tool definitions based on system.md
const toolDefinitions: Tool[] = [ // Use Tool[] type
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


export function setupServer(): Server {
    logger.info('Setting up MCP server...');
    // Read package.json using fs for ESM compatibility
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const packageJsonPath = path.resolve(__dirname, '../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const serverVersion = packageJson.version || '0.1.0';

    const server = new Server(
        {
            name: 'github-contribution-mcp',
            version: serverVersion,
        },
        {
            capabilities: {
                tools: {}, // Indicate tool support
            },
        },
    );

    // Register tools/list handler
    // Assuming ListToolsRequestSchema is implicitly handled or imported differently
    server.setRequestHandler(ListToolsRequestSchema, async (request: ListToolsRequest): Promise<ListToolsResult> => { // Use schema and types
        logger.info('Received tools/list request.');
        return {
            tools: toolDefinitions,
        };
    });

    // Register tools/call handler
    // Assuming CallToolRequestSchema is implicitly handled or imported differently
    server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest): Promise<CallToolResult> => { // Use schema and types
        const { name, arguments: args } = request.params;
        logger.info({ toolName: name, args }, `Received tools/call request for tool: ${name}`);

        try {
            switch (name) {
                case 'upsert_file_and_commit':
                    // Delegate to the specific handler
                    // Type assertion for arguments might be needed depending on handler signature
                    return await handleUpsertFile(args as any); // TODO: Define specific argument types
                case 'update_pr_description':
                    // Delegate to the specific handler
                    return await handleUpdatePr(args as any); // TODO: Define specific argument types
                default:
                    logger.warn(`Unknown tool requested: ${name}`);
                    throw new McpError(ErrorCode.MethodNotFound, `Tool '${name}' not found.`); // Restore MCP error
            }
        } catch (error: any) {
            logger.error({ err: error, toolName: name }, `Error executing tool '${name}'`);
            // Ensure errors are returned in the expected CallToolResult format
            return {
                isError: true,
                content: [{ type: 'text', text: `Error executing tool ${name}: ${error.message}` }], // Keep structure, type checked now
            };
        }
    });


    logger.info(`MCP server v${serverVersion} setup complete. Registered tool handlers.`);
    return server;
}