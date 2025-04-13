import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { getAuthenticatedOctokit } from '../github/client.js'; // Add .js extension
import config from '../config.js'; // Add .js extension
import logger from '../logger.js'; // Add .js extension

// Define the expected structure for the arguments
interface UpdatePrArgs {
    branchName: string;
    description: string;
}

export default async function handleUpdatePr(args: UpdatePrArgs): Promise<CallToolResult> {
    const { branchName, description } = args;
    const toolName = 'update_pr_description';
    logger.info({ toolName, args: { branchName, description: '[omitted]' } }, `Executing tool: ${toolName}`); // Omit potentially long description

    // 1. Input Validation
    if (!branchName || description === undefined || description === null) {
        const errMsg = 'Missing required arguments: branchName and description are required.';
        logger.warn({ toolName, args }, errMsg);
        return { isError: true, content: [{ type: 'text', text: `Error in ${toolName}: ${errMsg}` }] };
    }

    try {
        // 2. Get GitHub Client
        logger.debug({ toolName }, 'Getting authenticated Octokit instance...');
        const octokit = await getAuthenticatedOctokit();
        logger.debug({ toolName }, 'Octokit instance obtained.');

        // 3. Find the Pull Request
        const owner = config.githubTargetOwner;
        const repo = config.githubTargetRepo;
        const head = `${owner}:${branchName}`; // Format required by API: 'owner:branch'

        logger.info({ toolName, owner, repo, head }, `Searching for open PR with head '${head}'...`);

        const { data: pullRequests } = await octokit.rest.pulls.list({
            owner,
            repo,
            state: 'open',
            head: head,
        });

        if (pullRequests.length === 0) {
            const errMsg = `No open pull request found for branch '${branchName}' (${head}).`;
            logger.warn({ toolName, head }, errMsg);
            return { isError: true, content: [{ type: 'text', text: `Error in ${toolName}: ${errMsg}` }] };
        }

        if (pullRequests.length > 1) {
            // This case is unlikely but possible if branches were force-pushed/recreated weirdly.
            // Log a warning and use the first one found (usually the most recent).
            logger.warn({ toolName, head, count: pullRequests.length }, `Multiple open PRs found for branch '${branchName}'. Using the first one found (PR #${pullRequests[0].number}).`);
        }

        const pullRequest = pullRequests[0];
        const pullNumber = pullRequest.number;
        logger.info({ toolName, head, pullNumber, prUrl: pullRequest.html_url }, `Found PR #${pullNumber}.`);

        // 4. Update PR Description
        logger.info({ toolName, pullNumber }, `Updating description for PR #${pullNumber}...`);
        const { data: updatedPr } = await octokit.rest.pulls.update({
            owner,
            repo,
            pull_number: pullNumber,
            body: description, // Update the body (description)
        });

        const successMsg = `Successfully updated pull request description for branch ${branchName}. View PR: ${updatedPr.html_url}`;
        logger.info({ toolName, pullNumber, prUrl: updatedPr.html_url }, successMsg);

        // 5. Success Response
        return {
            content: [{ type: 'text', text: successMsg }],
        };

    } catch (error: any) {
        logger.error({ err: error, toolName, args: { branchName, description: '[omitted]' } }, `Error executing ${toolName}`);
        let userMessage = `Error updating PR description for branch ${branchName}: ${error.message}`;
        if (error.status === 404) {
            userMessage = `Error updating PR description: Pull request for branch ${branchName} not found or insufficient permissions.`;
        } else if (error.message?.includes('Authentication failed')) {
            userMessage = `Error updating PR description: GitHub authentication failed. Check App credentials and permissions.`;
        }
        return {
            isError: true,
            content: [{ type: 'text', text: userMessage }],
        };
    }
}