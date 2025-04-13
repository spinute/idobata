import { Octokit } from "@octokit/rest";
import config from "../config.js"; // Add .js extension
import logger from "../logger.js"; // Add .js extension
import path from 'path'; // Import path for potential future use

/**
 * Ensures that the specified branch and a corresponding draft pull request exist.
 * If the branch doesn't exist, it creates it from the base branch and then creates a draft PR.
 *
 * @param octokit - Authenticated Octokit instance.
 * @param branchName - The name of the branch to check/create.
 * @param filePath - The path of the file being modified (used for PR title).
 * @throws {Error} If any GitHub API call fails unexpectedly.
 */
export async function ensureBranchAndPrExists(
    octokit: Octokit,
    branchName: string,
    filePath: string // Added filePath for a more informative PR title
): Promise<void> {
    const owner = config.githubTargetOwner;
    const repo = config.githubTargetRepo;
    const baseBranch = config.githubBaseBranch;
    const headBranchRef = `heads/${branchName}`;
    const qualifiedBranchName = `${owner}:${branchName}`;

    logger.info(`Checking existence of branch '${branchName}' in ${owner}/${repo}...`);

    try {
        // 1. Check if branch exists
        await octokit.rest.git.getRef({
            owner,
            repo,
            ref: headBranchRef,
        });
        logger.info(`Branch '${branchName}' already exists.`);
        // Optional: Check if PR exists for this branch if needed, but the spec focuses on creation.
        // The update_pr_description tool handles finding the existing PR.

    } catch (error: any) {
        if (error.status === 404) {
            // Branch does not exist, proceed to create it and the PR
            logger.info(`Branch '${branchName}' not found. Creating branch and draft PR...`);

            try {
                // 2a. Get base branch SHA
                logger.debug(`Fetching SHA for base branch '${baseBranch}'...`);
                const { data: baseRefData } = await octokit.rest.git.getRef({
                    owner,
                    repo,
                    ref: `heads/${baseBranch}`,
                });
                const baseSha = baseRefData.object.sha;
                logger.debug(`Base branch '${baseBranch}' SHA: ${baseSha}`);

                // 2b. Create new branch
                logger.debug(`Creating branch '${branchName}' from SHA ${baseSha}...`);
                await octokit.rest.git.createRef({
                    owner,
                    repo,
                    ref: `refs/${headBranchRef}`, // Must be fully qualified ref
                    sha: baseSha,
                });
                logger.info(`Successfully created branch '${branchName}'.`);

                // 2c. Create Draft PR
                const prTitle = `WIP: Proposing changes in ${path.basename(filePath)} via ${branchName}`;
                const prBody = `Automated draft PR created for changes in branch \`${branchName}\`. File targeted: \`${filePath}\`.`;
                logger.debug(`Creating draft PR titled: "${prTitle}"`);
                const { data: prData } = await octokit.rest.pulls.create({
                    owner,
                    repo,
                    title: prTitle,
                    head: branchName, // Use just the branch name for head here
                    base: baseBranch,
                    body: prBody,
                    draft: true,
                });
                logger.info(`Successfully created draft PR #${prData.number}: ${prData.html_url}`);

            } catch (creationError: any) {
                logger.error({ err: creationError }, `Failed to create branch '${branchName}' or its draft PR.`);
                throw new Error(`Failed during branch/PR creation for '${branchName}': ${creationError.message}`);
            }
        } else {
            // Other error checking branch existence
            logger.error({ err: error }, `Error checking branch '${branchName}' existence.`);
            throw new Error(`Failed to check branch '${branchName}': ${error.message}`);
        }
    }
}

/**
 * Validates if a given file path is safe and within the target directory.
 * Prevents directory traversal and ensures it's a markdown file.
 *
 * @param relativeFilePath - The file path relative to GITHUB_TARGET_DIRECTORY.
 * @returns {boolean} True if the path is valid, false otherwise.
 */
export function isValidFilePath(relativeFilePath: string): boolean {
    if (!relativeFilePath || typeof relativeFilePath !== 'string') {
        logger.warn('Invalid file path provided: null or not a string.');
        return false;
    }

    // Ensure it ends with .md
    if (!relativeFilePath.toLowerCase().endsWith('.md')) {
        logger.warn(`Invalid file path: "${relativeFilePath}" does not end with .md`);
        return false;
    }

    // Prevent directory traversal
    if (relativeFilePath.includes('..')) {
        logger.warn(`Invalid file path: "${relativeFilePath}" contains '..'`);
        return false;
    }

    // Optional: Check for other potentially harmful characters or patterns if needed

    // Construct the full path relative to the repo root for logging/checking (optional)
    // const fullPath = path.join(config.githubTargetDirectory, relativeFilePath);
    // logger.debug(`Validated file path: "${relativeFilePath}" (Full path: "${fullPath}")`);

    return true;
}