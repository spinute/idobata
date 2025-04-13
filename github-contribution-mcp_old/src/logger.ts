import pinoImport from 'pino'; // Import the namespace
const pino = pinoImport.default ?? pinoImport; // Access default export, fallback to namespace itself
import config from './config.js'; // Add .js extension

// Determine if running in production or development
const isProduction = process.env.NODE_ENV === 'production';

// Configure pino options
const pinoOptions: pinoImport.LoggerOptions = { // Use the imported name for the type
    level: config.logLevel,
};

// Use pino-pretty for development, JSON for production
// Always use basic JSON logging for now to ensure no stdout interference
// if (!isProduction) {
//     pinoOptions.transport = {
//         target: 'pino-pretty',
//         options: {
//             colorize: true, // Enable colorized output
//             translateTime: 'SYS:yyyy-mm-dd HH:MM:ss', // Human-readable timestamp
//             ignore: 'pid,hostname', // Hide pid and hostname for cleaner logs
//         },
//     };
// }
// Create and export the logger instance
const logger = pino(pinoOptions, pino.destination(process.stderr.fd)); // Write to stderr

export type Logger = typeof logger;
export default logger;