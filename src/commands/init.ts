import * as vscode from 'vscode';
import { CloudrailUtils } from "../tools/cloudrail_utils";
import { handleUnsetMandatoryFields } from '../tools/configuration';

let initializationInProgress = false;

export async function initializeEnvironment(showProgress: boolean, initSettings: boolean): Promise<boolean> {
    if (initializationInProgress) {
        vscode.window.showInformationMessage('Initialization already in progress');
        return false;
    }
    
    initializationInProgress = true;
    let isSettingsValid = true;
    if (initSettings) {
        if (!handleUnsetMandatoryFields()) {
            isSettingsValid = false;
            console.log(`Missing mandatory settings`);
        }
    }

    let initialized = false;

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: true
    }, async (progress, token) => {

        if (!await CloudrailUtils.isPythonInstalled()) {
            vscode.window.showErrorMessage('Missing prerequisite: python. please install either python3.7, python3.8, or python3.9 from https://www.python.org/downloads/');
            return;
        }

        await new Promise<void>((resolve) => {
            reportProgress(progress, showProgress, 20, 'Creating virtual environment if needed...');
            CloudrailUtils.createVenv()
            .then(() => {checkCancellation(token);})
            .then( async () => {
                if (await CloudrailUtils.getCloudrailVersion()) {
                    reportProgress(progress, showProgress, 70, 'Cloudrail already installed');
                } else {
                    reportProgress(progress, showProgress, 10, 'Installing Cloudrail...');
                    await CloudrailUtils.installCloudrail();
                }
            })
            .then(() => {checkCancellation(token);})
            .then( async () => {
                await CloudrailUtils.setCloudrailVersion();
            })
            .then(() => {checkCancellation(token);})
            .then( async () => {
                reportProgress(progress, showProgress, 10, 'Initialization complete!');
                await new Promise((resolve) => setTimeout(resolve, 2000));
                resolve();
                initialized = true;
            }).catch((e) => {
                console.log('Initialization cancelled due to:\n' + e);
                initialized = false;
            });

            initializationInProgress = false;
        });
    });

    console.log('Initialization succeeded? ' + initialized);
    return initialized && isSettingsValid;
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