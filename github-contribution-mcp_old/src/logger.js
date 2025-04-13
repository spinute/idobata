"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pino_1 = __importDefault(require("pino"));
const config_1 = __importDefault(require("./config"));
// Determine if running in production or development
const isProduction = process.env.NODE_ENV === 'production';
// Configure pino options
const pinoOptions = {
    level: config_1.default.logLevel,
};
// Use pino-pretty for development, JSON for production
if (!isProduction) {
    pinoOptions.transport = {
        target: 'pino-pretty',
        options: {
            colorize: true, // Enable colorized output
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss', // Human-readable timestamp
            ignore: 'pid,hostname', // Hide pid and hostname for cleaner logs
        },
    };
}
// Create and export the logger instance
const logger = (0, pino_1.default)(pinoOptions);
exports.default = logger;
