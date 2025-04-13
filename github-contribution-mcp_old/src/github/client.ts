import { App } from "@octokit/app";
import { Octokit } from "@octokit/rest";
import config from "../config.js"; // Add .js extension
import logger from "../logger.js"; // Add .js extension

let octokitInstance: Octokit | null = null; // Explicitly use Octokit from @octokit/rest
let tokenExpirationTime: number | null = null;

/**
 * Retrieves an authenticated Octokit instance using GitHub App credentials.
 * Handles token caching and renewal.
 * @returns {Promise<Octokit>} An authenticated Octokit instance.
 * @throws {Error} If authentication fails or required configuration is missing.
 */
export async function getAuthenticatedOctokit(): Promise<Octokit> { // Ensure return type matches
    const now = Date.now();

    // Check if cached token is still valid (e.g., valid for 5 minutes more)
    if (octokitInstance && tokenExpirationTime && tokenExpirationTime > now + 5 * 60 * 1000) {
        logger.debug("Using cached Octokit instance.");
        return octokitInstance;
    }

    logger.info("Authenticating with GitHub App to get new Octokit instance...");

    if (!config.githubAppId || !config.githubAppPrivateKey || !config.githubInstallationId) {
        logger.error("Missing required GitHub App configuration in environment variables.");
        throw new Error("GitHub App configuration is incomplete.");
    }

    try {
        const app = new App({
            appId: config.githubAppId,
            privateKey: config.githubAppPrivateKey,
            // Pass baseUrl if provided in config for GitHub Enterprise
            ...(config.githubApiBaseUrl && { Octokit: Octokit.defaults({ baseUrl: config.githubApiBaseUrl }) }),
        });

        // Retrieve installation access token
        // Note: getInstallationOctokit handles token generation and caching internally for its lifetime,
        // but we manage the instance caching here for potential reuse across multiple handler calls.
        // For more robust token caching/renewal, @octokit/app's internal mechanisms are preferred.
        // This example keeps a simple instance cache.
        const installationOctokit = await app.getInstallationOctokit(config.githubInstallationId);

        // Simple caching: Store the instance.
        // A more robust approach might involve checking token expiry from the auth response if needed,
        // but getInstallationOctokit aims to simplify this.
        octokitInstance = installationOctokit as Octokit; // Assert type to match variable/return type
        // Set a placeholder expiration; @octokit/app handles actual renewal.
        // We'll refresh after ~50 minutes to be safe (tokens last 60 mins).
        tokenExpirationTime = now + 50 * 60 * 1000;

        logger.info("Successfully authenticated and obtained Octokit instance.");
        return octokitInstance;

    } catch (error: any) {
        logger.error({ err: error }, "Failed to authenticate with GitHub App or get installation Octokit.");
        if (error.status === 401) {
            throw new Error("Authentication failed: Invalid GitHub App credentials or installation ID.");
        } else if (error.status === 404) {
            throw new Error(`Authentication failed: Installation ID ${config.githubInstallationId} not found.`);
        }
        throw new Error(`Failed to get authenticated Octokit instance: ${error.message}`);
    }
}