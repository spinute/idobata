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
exports.default = handleUpsertFile;
const client_1 = require("../github/client");
const utils_1 = require("../github/utils");
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("../logger"));
const path_1 = __importDefault(require("path"));
function handleUpsertFile(args) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const { filePath, branchName, content, commitMessage } = args;
        const toolName = 'upsert_file_and_commit';
        logger_1.default.info({ toolName, args }, `Executing tool: ${toolName}`);
        // 1. Input Validation
        if (!filePath || !branchName || content === undefined || content === null || !commitMessage) {
            const errMsg = 'Missing required arguments: filePath, branchName, content, and commitMessage are required.';
            logger_1.default.warn({ toolName, args }, errMsg);
            return { isError: true, content: [{ type: 'text', text: `Error in ${toolName}: ${errMsg}` }] };
        }
        if (!(0, utils_1.isValidFilePath)(filePath)) {
            const errMsg = `Invalid filePath "${filePath}". It must be a relative path ending in .md and cannot contain '..'.`;
            logger_1.default.warn({ toolName, args: Object.assign(Object.assign({}, args), { content: '[omitted]' }) }, errMsg); // Omit potentially large content from log
            return { isError: true, content: [{ type: 'text', text: `Error in ${toolName}: ${errMsg}` }] };
        }
        try {
            // 2. Get GitHub Client
            logger_1.default.debug({ toolName }, 'Getting authenticated Octokit instance...');
            const octokit = yield (0, client_1.getAuthenticatedOctokit)();
            logger_1.default.debug({ toolName }, 'Octokit instance obtained.');
            // 3. Ensure Branch and PR exist
            logger_1.default.debug({ toolName, branchName, filePath }, 'Ensuring branch and PR exist...');
            yield (0, utils_1.ensureBranchAndPrExists)(octokit, branchName, filePath);
            logger_1.default.debug({ toolName, branchName }, 'Branch and PR check/creation complete.');
            // 4. Prepare file path and content
            const fullPath = path_1.default.join(config_1.default.githubTargetDirectory, filePath).replace(/^\//, ''); // Ensure no leading slash for API
            const contentBase64 = Buffer.from(content, 'utf8').toString('base64');
            logger_1.default.debug({ toolName, fullPath }, 'File path and content prepared.');
            // 5. Get existing file SHA (if it exists)
            let currentSha;
            try {
                logger_1.default.debug({ toolName, fullPath, branchName }, 'Checking for existing file...');
                const { data: existingFileData } = yield octokit.rest.repos.getContent({
                    owner: config_1.default.githubTargetOwner,
                    repo: config_1.default.githubTargetRepo,
                    path: fullPath,
                    ref: branchName,
                });
                // Type guard to ensure it's a file object and has sha
                if (typeof existingFileData === 'object' && existingFileData !== null && 'sha' in existingFileData && typeof existingFileData.sha === 'string') {
                    currentSha = existingFileData.sha;
                    logger_1.default.info({ toolName, fullPath, branchName, sha: currentSha }, 'Existing file found.');
                }
                else {
                    logger_1.default.warn({ toolName, fullPath, branchName, response: existingFileData }, 'getContent response was not a file object with SHA.');
                    // Treat as if file doesn't exist if response format is unexpected
                }
            }
            catch (error) {
                if (error.status === 404) {
                    logger_1.default.info({ toolName, fullPath, branchName }, 'File does not exist, will create new.');
                    currentSha = undefined; // Explicitly undefined for clarity
                }
                else {
                    logger_1.default.error({ err: error, toolName, fullPath, branchName }, 'Error checking for existing file.');
                    throw new Error(`Failed to check for existing file: ${error.message}`);
                }
            }
            // 6. Create or Update File Content
            logger_1.default.info({ toolName, fullPath, branchName, sha: currentSha }, `Attempting to ${currentSha ? 'update' : 'create'} file...`);
            const { data: commitData } = yield octokit.rest.repos.createOrUpdateFileContents({
                owner: config_1.default.githubTargetOwner,
                repo: config_1.default.githubTargetRepo,
                path: fullPath,
                message: commitMessage,
                content: contentBase64,
                branch: branchName,
                sha: currentSha, // Include SHA only if updating
            });
            const commitSha = commitData.commit.sha;
            const htmlUrl = ((_a = commitData.content) === null || _a === void 0 ? void 0 : _a.html_url) || '#'; // Fallback URL
            const successMsg = `Successfully ${currentSha ? 'updated' : 'created'} and committed changes to ${filePath} (SHA: ${commitSha}). View file: ${htmlUrl}`;
            logger_1.default.info({ toolName, commitSha, htmlUrl }, successMsg);
            // 7. Success Response
            return {
                content: [{ type: 'text', text: successMsg }],
            };
        }
        catch (error) {
            logger_1.default.error({ err: error, toolName, args: Object.assign(Object.assign({}, args), { content: '[omitted]' }) }, `Error executing ${toolName}`);
            let userMessage = `Error processing file ${filePath}: ${error.message}`;
            // Handle potential merge conflicts specifically
            if (error.status === 409) {
                userMessage = `Error processing file ${filePath}: A merge conflict occurred. Please resolve the conflict manually or try again with the latest file content.`;
                logger_1.default.warn({ toolName, filePath, branchName }, 'Merge conflict detected (409).');
            }
            else if ((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes('Authentication failed')) {
                userMessage = `Error processing file ${filePath}: GitHub authentication failed. Check App credentials and permissions.`;
            }
            return {
                isError: true,
                content: [{ type: 'text', text: userMessage }],
            };
        }
    });
}
