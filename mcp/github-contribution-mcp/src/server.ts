import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import logger from './logger.js';
import { z } from 'zod'; // Import Zod

// サーバーインスタンスを作成
const server = new McpServer({
    name: "github-contribution-mcp",
    version: "0.1.0", // package.jsonのバージョンと合わせるのが良い
}); // Remove logger from constructor

// --- ここにツールやリソースのハンドラを追加していく ---

// 例: シンプルなツール (後で削除または変更)
server.tool(
    "ping",
    {}, // Use an empty object for no parameters
    async () => {
        logger.info('Ping tool called');
        return { content: [{ type: "text", text: "pong" }] };
    }
);

export default server;