import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Define the structure of the application configuration
export interface AppConfig {
    githubAppId: string;
    githubAppPrivateKey: string;
    githubInstallationId: number;
    githubTargetOwner: string;
    githubTargetRepo: string;
    githubTargetDirectory: string;
    githubBaseBranch: string;
    logLevel: string;
    githubApiBaseUrl?: string; // Optional
}

// Function to get a required environment variable or throw an error
function getRequiredEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}

// Load and validate configuration
const config: AppConfig = {
    githubAppId: getRequiredEnv('GITHUB_APP_ID'),
    // Replace literal '\n' with actual newlines for the private key
    githubAppPrivateKey: getRequiredEnv('GITHUB_APP_PRIVATE_KEY').replace(
        /\\n/g,
        '\n',
    ),
    githubInstallationId: (() => {
        const idStr = getRequiredEnv('GITHUB_INSTALLATION_ID');
        const id = parseInt(idStr, 10);
        if (isNaN(id)) {
            throw new Error(`Invalid GITHUB_INSTALLATION_ID: "${idStr}" is not a valid number.`);
        }
        return id;
    })(),
    githubTargetOwner: getRequiredEnv('GITHUB_TARGET_OWNER'),
    githubTargetRepo: getRequiredEnv('GITHUB_TARGET_REPO'),
    // Allow empty string for root directory, remove trailing slash if present
    githubTargetDirectory: (
        process.env.GITHUB_TARGET_DIRECTORY || ''
    ).replace(/\/$/, ''),
    githubBaseBranch: getRequiredEnv('GITHUB_BASE_BRANCH'),
    logLevel: process.env.LOG_LEVEL || 'info',
    githubApiBaseUrl: process.env.GITHUB_API_BASE_URL || undefined, // Use undefined if not set
};

// Validate log level (optional, but good practice)
const validLogLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
if (!validLogLevels.includes(config.logLevel)) {
    console.warn(
        `Invalid LOG_LEVEL "${config.logLevel}". Defaulting to "info". Valid levels are: ${validLogLevels.join(', ')}`,
    );
    config.logLevel = 'info';
}

export default config;