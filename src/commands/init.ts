import * as vscode from 'vscode';
import { CloudrailUtils } from "../tools/cloudrail_utils";

export function initializeEnvironment(showProgress: boolean, 
                                      onFulfilled: () => void = () => {},
                                      onRejected: () => void = () => {}): void {
    if (!areMandatoryFieldsSet()) {
        vscode.commands.executeCommand('workbench.action.openSettings', 'cloudrail');
    }

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: true
    }, (progress, token) => {
        token.onCancellationRequested(() => {
            console.log("Cancelled virtual environment creation");
        });

        return new Promise<void>((resolve) => {
            reportProgress(progress, showProgress, 20, 'Creating virtual environment if needed...');
            CloudrailUtils.createVenv()
            .then( async () => {
                if (await CloudrailUtils.getCloudrailVersion()) {
                    reportProgress(progress, showProgress, 70, 'Cloudrail already installed');
                } else {
                    reportProgress(progress, showProgress, 10, 'Installing Cloudrail...');
                    await CloudrailUtils.installCloudrail();
                }
            }).then( async () => {
                await CloudrailUtils.setCloudrailVersion();
            }).then( async () => {
                reportProgress(progress, showProgress, 10, 'Initialization complete!');
                await new Promise((resolve) => setTimeout(resolve, 2000));
                resolve();
            });
        });
});}

function reportProgress(progress: vscode.Progress<{ message?: string; increment?: number }>, 
                        showProgress: boolean, 
                        increment: number, 
                        message: string): void {
    if (showProgress) {
        progress.report({ increment: increment, message: message });
    }
}

function areMandatoryFieldsSet(): boolean {
    const mandatoryFields = [
        'TerraformWorkingDirectory',
        'ApiKey'
    ];

    return (mandatoryFields.every((key => {
        let value: string = vscode.workspace.getConfiguration('cloudrail').get(key, ''); 
        return value !== '';
    })));
}