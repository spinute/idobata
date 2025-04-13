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
exports.ensureBranchAndPrExists = ensureBranchAndPrExists;
exports.isValidFilePath = isValidFilePath;
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("../logger"));
const path_1 = __importDefault(require("path")); // Import path for potential future use
/**
 * Ensures that the specified branch and a corresponding draft pull request exist.
 * If the branch doesn't exist, it creates it from the base branch and then creates a draft PR.
 *
 * @param octokit - Authenticated Octokit instance.
 * @param branchName - The name of the branch to check/create.
 * @param filePath - The path of the file being modified (used for PR title).
 * @throws {Error} If any GitHub API call fails unexpectedly.
 */
function ensureBranchAndPrExists(octokit, branchName, filePath // Added filePath for a more informative PR title
) {
    return __awaiter(this, void 0, void 0, function* () {
        const owner = config_1.default.githubTargetOwner;
        const repo = config_1.default.githubTargetRepo;
        const baseBranch = config_1.default.githubBaseBranch;
        const headBranchRef = `heads/${branchName}`;
        const qualifiedBranchName = `${owner}:${branchName}`;
        logger_1.default.info(`Checking existence of branch '${branchName}' in ${owner}/${repo}...`);
        try {
            // 1. Check if branch exists
            yield octokit.rest.git.getRef({
                owner,
                repo,
                ref: headBranchRef,
            });
            logger_1.default.info(`Branch '${branchName}' already exists.`);
            // Optional: Check if PR exists for this branch if needed, but the spec focuses on creation.
            // The update_pr_description tool handles finding the existing PR.
        }
        catch (error) {
            if (error.status === 404) {
                // Branch does not exist, proceed to create it and the PR
                logger_1.default.info(`Branch '${branchName}' not found. Creating branch and draft PR...`);
                try {
                    // 2a. Get base branch SHA
                    logger_1.default.debug(`Fetching SHA for base branch '${baseBranch}'...`);
                    const { data: baseRefData } = yield octokit.rest.git.getRef({
                        owner,
                        repo,
                        ref: `heads/${baseBranch}`,
                    });
                    const baseSha = baseRefData.object.sha;
                    logger_1.default.debug(`Base branch '${baseBranch}' SHA: ${baseSha}`);
                    // 2b. Create new branch
                    logger_1.default.debug(`Creating branch '${branchName}' from SHA ${baseSha}...`);
                    yield octokit.rest.git.createRef({
                        owner,
                        repo,
                        ref: `refs/${headBranchRef}`, // Must be fully qualified ref
                        sha: baseSha,
                    });
                    logger_1.default.info(`Successfully created branch '${branchName}'.`);
                    // 2c. Create Draft PR
                    const prTitle = `WIP: Proposing changes in ${path_1.default.basename(filePath)} via ${branchName}`;
                    const prBody = `Automated draft PR created for changes in branch \`${branchName}\`. File targeted: \`${filePath}\`.`;
                    logger_1.default.debug(`Creating draft PR titled: "${prTitle}"`);
                    const { data: prData } = yield octokit.rest.pulls.create({
                        owner,
                        repo,
                        title: prTitle,
                        head: branchName, // Use just the branch name for head here
                        base: baseBranch,
                        body: prBody,
                        draft: true,
                    });
                    logger_1.default.info(`Successfully created draft PR #${prData.number}: ${prData.html_url}`);
                }
                catch (creationError) {
                    logger_1.default.error({ err: creationError }, `Failed to create branch '${branchName}' or its draft PR.`);
                    throw new Error(`Failed during branch/PR creation for '${branchName}': ${creationError.message}`);
                }
            }
            else {
                // Other error checking branch existence
                logger_1.default.error({ err: error }, `Error checking branch '${branchName}' existence.`);
                throw new Error(`Failed to check branch '${branchName}': ${error.message}`);
            }
        }
    });
}
/**
 * Validates if a given file path is safe and within the target directory.
 * Prevents directory traversal and ensures it's a markdown file.
 *
 * @param relativeFilePath - The file path relative to GITHUB_TARGET_DIRECTORY.
 * @returns {boolean} True if the path is valid, false otherwise.
 */
function isValidFilePath(relativeFilePath) {
    if (!relativeFilePath || typeof relativeFilePath !== 'string') {
        logger_1.default.warn('Invalid file path provided: null or not a string.');
        return false;
    }
    // Ensure it ends with .md
    if (!relativeFilePath.toLowerCase().endsWith('.md')) {
        logger_1.default.warn(`Invalid file path: "${relativeFilePath}" does not end with .md`);
        return false;
    }
    // Prevent directory traversal
    if (relativeFilePath.includes('..')) {
        logger_1.default.warn(`Invalid file path: "${relativeFilePath}" contains '..'`);
        return false;
    }
    // Optional: Check for other potentially harmful characters or patterns if needed
    // Construct the full path relative to the repo root for logging/checking (optional)
    // const fullPath = path.join(config.githubTargetDirectory, relativeFilePath);
    // logger.debug(`Validated file path: "${relativeFilePath}" (Full path: "${fullPath}")`);
    return true;
}
