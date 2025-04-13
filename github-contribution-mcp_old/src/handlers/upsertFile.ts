import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { getAuthenticatedOctokit } from '../github/client.js'; // Add .js extension
import { ensureBranchAndPrExists, isValidFilePath } from '../github/utils.js'; // Add .js extension
import config from '../config.js'; // Add .js extension
import logger from '../logger.js'; // Add .js extension
import path from 'path';

// Define the expected structure for the arguments
interface UpsertFileArgs {
    filePath: string;
    branchName: string;
    content: string;
    commitMessage: string;
}

export default async function handleUpsertFile(args: UpsertFileArgs): Promise<CallToolResult> {
    const { filePath, branchName, content, commitMessage } = args;
    const toolName = 'upsert_file_and_commit';
    logger.info({ toolName, args }, `Executing tool: ${toolName}`);

    // 1. Input Validation
    if (!filePath || !branchName || content === undefined || content === null || !commitMessage) {
        const errMsg = 'Missing required arguments: filePath, branchName, content, and commitMessage are required.';
        logger.warn({ toolName, args }, errMsg);
        return { isError: true, content: [{ type: 'text', text: `Error in ${toolName}: ${errMsg}` }] };
    }
    if (!isValidFilePath(filePath)) {
        const errMsg = `Invalid filePath "${filePath}". It must be a relative path ending in .md and cannot contain '..'.`;
        logger.warn({ toolName, args: { ...args, content: '[omitted]' } }, errMsg); // Omit potentially large content from log
        return { isError: true, content: [{ type: 'text', text: `Error in ${toolName}: ${errMsg}` }] };
    }

    try {
        // 2. Get GitHub Client
        logger.debug({ toolName }, 'Getting authenticated Octokit instance...');
        const octokit = await getAuthenticatedOctokit();
        logger.debug({ toolName }, 'Octokit instance obtained.');

        // 3. Ensure Branch and PR exist
        logger.debug({ toolName, branchName, filePath }, 'Ensuring branch and PR exist...');
        await ensureBranchAndPrExists(octokit, branchName, filePath);
        logger.debug({ toolName, branchName }, 'Branch and PR check/creation complete.');

        // 4. Prepare file path and content
        const fullPath = path.join(config.githubTargetDirectory, filePath).replace(/^\//, ''); // Ensure no leading slash for API
        const contentBase64 = Buffer.from(content, 'utf8').toString('base64');
        logger.debug({ toolName, fullPath }, 'File path and content prepared.');

        // 5. Get existing file SHA (if it exists)
        let currentSha: string | undefined;
        try {
            logger.debug({ toolName, fullPath, branchName }, 'Checking for existing file...');
            const { data: existingFileData } = await octokit.rest.repos.getContent({
                owner: config.githubTargetOwner,
                repo: config.githubTargetRepo,
                path: fullPath,
                ref: branchName,
            });
            // Type guard to ensure it's a file object and has sha
            if (typeof existingFileData === 'object' && existingFileData !== null && 'sha' in existingFileData && typeof existingFileData.sha === 'string') {
                currentSha = existingFileData.sha;
                logger.info({ toolName, fullPath, branchName, sha: currentSha }, 'Existing file found.');
            } else {
                logger.warn({ toolName, fullPath, branchName, response: existingFileData }, 'getContent response was not a file object with SHA.');
                // Treat as if file doesn't exist if response format is unexpected
            }

        } catch (error: any) {
            if (error.status === 404) {
                logger.info({ toolName, fullPath, branchName }, 'File does not exist, will create new.');
                currentSha = undefined; // Explicitly undefined for clarity
            } else {
                logger.error({ err: error, toolName, fullPath, branchName }, 'Error checking for existing file.');
                throw new Error(`Failed to check for existing file: ${error.message}`);
            }
        }

        // 6. Create or Update File Content
        logger.info({ toolName, fullPath, branchName, sha: currentSha }, `Attempting to ${currentSha ? 'update' : 'create'} file...`);
        const { data: commitData } = await octokit.rest.repos.createOrUpdateFileContents({
            owner: config.githubTargetOwner,
            repo: config.githubTargetRepo,
            path: fullPath,
            message: commitMessage,
            content: contentBase64,
            branch: branchName,
            sha: currentSha, // Include SHA only if updating
        });

        const commitSha = commitData.commit.sha;
        const htmlUrl = commitData.content?.html_url || '#'; // Fallback URL
        const successMsg = `Successfully ${currentSha ? 'updated' : 'created'} and committed changes to ${filePath} (SHA: ${commitSha}). View file: ${htmlUrl}`;
        logger.info({ toolName, commitSha, htmlUrl }, successMsg);

        // 7. Success Response
        return {
            content: [{ type: 'text', text: successMsg }],
        };

    } catch (error: any) {
        logger.error({ err: error, toolName, args: { ...args, content: '[omitted]' } }, `Error executing ${toolName}`);
        let userMessage = `Error processing file ${filePath}: ${error.message}`;
        // Handle potential merge conflicts specifically
        if (error.status === 409) {
            userMessage = `Error processing file ${filePath}: A merge conflict occurred. Please resolve the conflict manually or try again with the latest file content.`;
            logger.warn({ toolName, filePath, branchName }, 'Merge conflict detected (409).');
        } else if (error.message?.includes('Authentication failed')) {
            userMessage = `Error processing file ${filePath}: GitHub authentication failed. Check App credentials and permissions.`;
        }
        return {
            isError: true,
            content: [{ type: 'text', text: userMessage }],
        };
    }
}