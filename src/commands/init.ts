import { Versioning } from "../tools/versioning";
import * as vscode from 'vscode';
import { CloudrailUtils } from "../tools/cloudrail_utils";

export function initializeEnvironment(showProgress: boolean): void {
    openSettingsIfMandatoryFieldsAreNotSet();
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: true
    }, (progress, token) => {
        token.onCancellationRequested(() => {
            console.log("Cancelled virtual environment creation");
        });
        const p = new Promise<void>(resolve => {
            reportProgress(progress, showProgress, 0, 'Creating Virtual Environment');

            CloudrailUtils.createVenv((exitCode: number) => {
                console.log(`venv creation process exited with code ${exitCode}`);
                if (exitCode !== 0) {
                    resolve();
                    vscode.window.showErrorMessage(`Venv creation failed with exit code ${exitCode}`);
                    return;
                }
                
                reportProgress(progress, showProgress, 20, 'Virtual Environment Created');

                try {
                    setCloudrailVersion();
                    reportProgress(progress, showProgress, 80, 'Initialization Complete');
                } catch(e) { 
                    try {
                        reportProgress(progress, showProgress, 30, 'Installing Cloudrail on the Virtual Environment');
                        CloudrailUtils.installCloudrail();
                        reportProgress(progress, showProgress, 40, 'Successfuly installed Cloudrail');
                        setCloudrailVersion();
                        reportProgress(progress, showProgress, 10, 'Initialization Complete');
                    } catch(e) {
                        resolve();
                        vscode.window.showErrorMessage(`Failed to install cloudrail - exit code: ${exitCode}\nError:${e}`);
                    }
                }

                resolve();
            });   
        });

        return p;
    });      
}

function reportProgress(progress: vscode.Progress<{ message?: string; increment?: number }>, 
                        showProgress: boolean, 
                        increment: number, 
                        message: string): void {
    if (showProgress) {
        progress.report({ increment: increment, message: message });
    }
}

function setCloudrailVersion() {
    let versionOutput = CloudrailUtils.getCloudrailVersion();
    Versioning.setCloudrailVersion(versionOutput);
    console.log(Versioning.getCloudrailVersion());
}

async function openSettingsIfMandatoryFieldsAreNotSet() {
    const mandatoryFields = [
        'TerraformWorkingDirectory',
        'ApiKey'
    ];

    if (mandatoryFields.some((key => {
        let value: string = vscode.workspace.getConfiguration('cloudrail').get(key, ''); 
        return value === '';
    }))) {
        vscode.commands.executeCommand('workbench.action.openSettings', 'cloudrail');
    }
}