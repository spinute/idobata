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
exports.getAuthenticatedOctokit = getAuthenticatedOctokit;
const app_1 = require("@octokit/app");
const rest_1 = require("@octokit/rest");
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("../logger"));
let octokitInstance = null; // Explicitly use Octokit from @octokit/rest
let tokenExpirationTime = null;
/**
 * Retrieves an authenticated Octokit instance using GitHub App credentials.
 * Handles token caching and renewal.
 * @returns {Promise<Octokit>} An authenticated Octokit instance.
 * @throws {Error} If authentication fails or required configuration is missing.
 */
function getAuthenticatedOctokit() {
    return __awaiter(this, void 0, void 0, function* () {
        const now = Date.now();
        // Check if cached token is still valid (e.g., valid for 5 minutes more)
        if (octokitInstance && tokenExpirationTime && tokenExpirationTime > now + 5 * 60 * 1000) {
            logger_1.default.debug("Using cached Octokit instance.");
            return octokitInstance;
        }
        logger_1.default.info("Authenticating with GitHub App to get new Octokit instance...");
        if (!config_1.default.githubAppId || !config_1.default.githubAppPrivateKey || !config_1.default.githubInstallationId) {
            logger_1.default.error("Missing required GitHub App configuration in environment variables.");
            throw new Error("GitHub App configuration is incomplete.");
        }
        try {
            const app = new app_1.App(Object.assign({ appId: config_1.default.githubAppId, privateKey: config_1.default.githubAppPrivateKey }, (config_1.default.githubApiBaseUrl && { Octokit: rest_1.Octokit.defaults({ baseUrl: config_1.default.githubApiBaseUrl }) })));
            // Retrieve installation access token
            // Note: getInstallationOctokit handles token generation and caching internally for its lifetime,
            // but we manage the instance caching here for potential reuse across multiple handler calls.
            // For more robust token caching/renewal, @octokit/app's internal mechanisms are preferred.
            // This example keeps a simple instance cache.
            const installationOctokit = yield app.getInstallationOctokit(config_1.default.githubInstallationId);
            // Simple caching: Store the instance.
            // A more robust approach might involve checking token expiry from the auth response if needed,
            // but getInstallationOctokit aims to simplify this.
            octokitInstance = installationOctokit; // Assert type to match variable/return type
            // Set a placeholder expiration; @octokit/app handles actual renewal.
            // We'll refresh after ~50 minutes to be safe (tokens last 60 mins).
            tokenExpirationTime = now + 50 * 60 * 1000;
            logger_1.default.info("Successfully authenticated and obtained Octokit instance.");
            return octokitInstance;
        }
        catch (error) {
            logger_1.default.error({ err: error }, "Failed to authenticate with GitHub App or get installation Octokit.");
            if (error.status === 401) {
                throw new Error("Authentication failed: Invalid GitHub App credentials or installation ID.");
            }
            else if (error.status === 404) {
                throw new Error(`Authentication failed: Installation ID ${config_1.default.githubInstallationId} not found.`);
            }
            throw new Error(`Failed to get authenticated Octokit instance: ${error.message}`);
        }
    });
}
