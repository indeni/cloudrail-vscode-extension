import * as vscode from 'vscode';
import { CloudrailRunner } from "../cloudrail_runner";
import { logger } from '../tools/logger';

let initializationInProgress = false; // Boolean that is used to ensure only one initialization processes work
let lastInitializationSucceeded = false; // Boolean that is used to indicate if last initialization was a success, used when there is an initialization already in progress

export async function initializeEnvironment(showProgress: boolean): Promise<boolean> {
    if (initializationInProgress) {
        logger.debug('Initialization in progress - will wait for current initialization to complete');
        while (initializationInProgress) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        return lastInitializationSucceeded;
    }
    
    initializationInProgress = true;
    let initialized = false;
    const onInitEnd = () => {
        initializationInProgress = false; 
        lastInitializationSucceeded = initialized; 
    };

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: true
    }, async (progress, token) => {

        if (!await CloudrailRunner.isPythonInstalled()) {
            vscode.window.showErrorMessage('Missing prerequisite: python. please install either python3.8, or python3.9 from https://www.python.org/downloads/');
            return;
        }

        try {
            reportProgress(progress, showProgress, 20, 'Creating virtual environment if needed...');
            await CloudrailRunner.createVenv();
            checkCancellation(token);

            if (await CloudrailRunner.getCloudrailVersion()) {
                reportProgress(progress, showProgress, 70, 'Cloudrail already installed');
            } else {
                reportProgress(progress, showProgress, 10, 'Installing Cloudrail...');
                await CloudrailRunner.installCloudrail();
            }
            checkCancellation(token);
            await CloudrailRunner.setCloudrailVersion();
            checkCancellation(token);
            reportProgress(progress, showProgress, 10, 'Initialization complete!');
            await new Promise((resolve) => setTimeout(resolve, 2000));
            initialized = true;
            
        } catch(e) { 
            vscode.window.showErrorMessage('Cloudrail initialization failed due to: ' + e);
            logger.info('Initialization cancelled due to:\n' + e);
            initialized = false;
        }
    }).then(onInitEnd, onInitEnd);

    logger.info('Initialization succeeded? ' + initialized);
    return initialized;
}

function reportProgress(progress: vscode.Progress<{ message?: string; increment?: number }>, 
                        showProgress: boolean, 
                        increment: number, 
                        message: string): void {
    if (showProgress) {
        progress.report({ increment: increment, message: message });
    }
}

function checkCancellation(token: vscode.CancellationToken) {
    if (token.isCancellationRequested) {
        throw new Error('User cancelled initialization');
    }
}