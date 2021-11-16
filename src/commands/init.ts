import vscode from 'vscode';
import { CloudrailRunner } from "../cloudrail_runner";
import { logger } from '../tools/logger';

let isInitializationInProgress = false;
let isLastInitializationSucceeded = false;

export async function initializeEnvironment(showProgress: boolean): Promise<boolean> {
    if (isInitializationInProgress) {
        logger.debug('Initialization in progress - will wait for current initialization to complete');
        while (isInitializationInProgress) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        return isLastInitializationSucceeded;
    }
    
    isInitializationInProgress = true;
    let initialized = false;

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

            let cloudrailVersion = await CloudrailRunner.getCloudrailVersion();
            if (cloudrailVersion) {
                reportProgress(progress, showProgress, 70, 'Cloudrail already installed');
            } else {
                reportProgress(progress, showProgress, 10, 'Installing Cloudrail...');
                await CloudrailRunner.installCloudrail();
                cloudrailVersion = await CloudrailRunner.getCloudrailVersion();
            }
            checkCancellation(token);
            CloudrailRunner.setCloudrailVersion(cloudrailVersion);
            checkCancellation(token);
            reportProgress(progress, showProgress, 10, 'Initialization complete!');
            await new Promise((resolve) => setTimeout(resolve, 2000));
            initialized = true;
            
        } catch(e) { 
            vscode.window.showErrorMessage('Cloudrail initialization failed due to: ' + e);
            logger.info('Initialization cancelled due to:\n' + e);
            initialized = false;
        }
    });

    isInitializationInProgress = false; 
    isLastInitializationSucceeded = initialized; 
    logger.info('Initialization succeeded? ' + initialized);
    return initialized;
}

export async function awaitInitialization(): Promise<void> {
    while (isInitializationInProgress) {
        await new Promise((resolve) => setTimeout(resolve, 200));
    }
}

function reportProgress(progress: vscode.Progress<{ message?: string; increment?: number }>, 
                        showProgress: boolean, 
                        increment: number, 
                        message: string): void {
    if (showProgress) {
        progress.report({ increment: increment, message: message });
    }
}

function checkCancellation(token: vscode.CancellationToken): void {
    if (!token.isCancellationRequested) {
        return;
    }

    throw new Error('User cancelled initialization');
}
