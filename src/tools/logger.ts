import * as winston from 'winston';
import { homedir } from 'os';
import { mkdirSync, existsSync } from 'fs';
import path from 'path';


const basePath: string = path.join(homedir(), '.cloudrail');

const myFormat = winston.format.combine(
    winston.format.timestamp({format: `MM/DD/YYYY HH:mm:ss`}), 
    winston.format.printf(({ level, message, timestamp }) => {
        console.log(message);
        return `[${timestamp}] [${level.toUpperCase()}]\t${message}`;
      }));

if (!existsSync(basePath)) {
    mkdirSync(basePath);
}

export const logger = winston.createLogger({
    format: myFormat,
    transports: [
        new winston.transports.File({ 
            dirname: basePath, 
            filename: 'cloudrail.vscode.log', 
            level: 'debug' })
    ]
});
