import winston from 'winston';
import { homedir } from 'os';
import { mkdirSync, existsSync } from 'fs';
import path from 'path';


const basePath: string = path.join(homedir(), '.cloudrail');
const filename = 'cloudrail.vscode.log';

const loggerFormat = winston.format.combine(
    winston.format.timestamp({format: `MM/DD/YYYY HH:mm:ss`}), 
    winston.format.printf(({ level, message, timestamp }) => {
        console.log(message);
        return `[${timestamp}] [${level.toUpperCase()}]\t${message}`;
      }));

if (!existsSync(basePath)) {
    mkdirSync(basePath);
}

export interface ImprovedLogger extends winston.Logger {
    exception: (error: any, prefix?: string) => void;
}

export const logger = winston.createLogger({
    format: loggerFormat,
    transports: [
        new winston.transports.File({ 
            dirname: basePath, 
            filename: filename, 
            level: 'debug' })
    ]
}) as ImprovedLogger;

logger.exception = function (error: any, prefix?: string): void {
    let logMsg = prefix + ': ' || '';
    if (error instanceof Error) {
        logMsg += error.message;
        logMsg += error.stack ? `\nStack: ${error.stack}` : '';
    } else {
        logMsg += error.toString();
    }

    logger.error(logMsg);
};

export const logPath = path.join(basePath, filename);

export default logger;