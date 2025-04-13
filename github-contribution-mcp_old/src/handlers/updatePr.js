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
exports.default = handleUpdatePr;
const client_1 = require("../github/client");
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("../logger"));
function handleUpdatePr(args) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const { branchName, description } = args;
        const toolName = 'update_pr_description';
        logger_1.default.info({ toolName, args: { branchName, description: '[omitted]' } }, `Executing tool: ${toolName}`); // Omit potentially long description
        // 1. Input Validation
        if (!branchName || description === undefined || description === null) {
            const errMsg = 'Missing required arguments: branchName and description are required.';
            logger_1.default.warn({ toolName, args }, errMsg);
            return { isError: true, content: [{ type: 'text', text: `Error in ${toolName}: ${errMsg}` }] };
        }
        try {
            // 2. Get GitHub Client
            logger_1.default.debug({ toolName }, 'Getting authenticated Octokit instance...');
            const octokit = yield (0, client_1.getAuthenticatedOctokit)();
            logger_1.default.debug({ toolName }, 'Octokit instance obtained.');
            // 3. Find the Pull Request
            const owner = config_1.default.githubTargetOwner;
            const repo = config_1.default.githubTargetRepo;
            const head = `${owner}:${branchName}`; // Format required by API: 'owner:branch'
            logger_1.default.info({ toolName, owner, repo, head }, `Searching for open PR with head '${head}'...`);
            const { data: pullRequests } = yield octokit.rest.pulls.list({
                owner,
                repo,
                state: 'open',
                head: head,
            });
            if (pullRequests.length === 0) {
                const errMsg = `No open pull request found for branch '${branchName}' (${head}).`;
                logger_1.default.warn({ toolName, head }, errMsg);
                return { isError: true, content: [{ type: 'text', text: `Error in ${toolName}: ${errMsg}` }] };
            }
            if (pullRequests.length > 1) {
                // This case is unlikely but possible if branches were force-pushed/recreated weirdly.
                // Log a warning and use the first one found (usually the most recent).
                logger_1.default.warn({ toolName, head, count: pullRequests.length }, `Multiple open PRs found for branch '${branchName}'. Using the first one found (PR #${pullRequests[0].number}).`);
            }
            const pullRequest = pullRequests[0];
            const pullNumber = pullRequest.number;
            logger_1.default.info({ toolName, head, pullNumber, prUrl: pullRequest.html_url }, `Found PR #${pullNumber}.`);
            // 4. Update PR Description
            logger_1.default.info({ toolName, pullNumber }, `Updating description for PR #${pullNumber}...`);
            const { data: updatedPr } = yield octokit.rest.pulls.update({
                owner,
                repo,
                pull_number: pullNumber,
                body: description, // Update the body (description)
            });
            const successMsg = `Successfully updated pull request description for branch ${branchName}. View PR: ${updatedPr.html_url}`;
            logger_1.default.info({ toolName, pullNumber, prUrl: updatedPr.html_url }, successMsg);
            // 5. Success Response
            return {
                content: [{ type: 'text', text: successMsg }],
            };
        }
        catch (error) {
            logger_1.default.error({ err: error, toolName, args: { branchName, description: '[omitted]' } }, `Error executing ${toolName}`);
            let userMessage = `Error updating PR description for branch ${branchName}: ${error.message}`;
            if (error.status === 404) {
                userMessage = `Error updating PR description: Pull request for branch ${branchName} not found or insufficient permissions.`;
            }
            else if ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('Authentication failed')) {
                userMessage = `Error updating PR description: GitHub authentication failed. Check App credentials and permissions.`;
            }
            return {
                isError: true,
                content: [{ type: 'text', text: userMessage }],
            };
        }
    });
}
