import { Versioning } from "../tools/versioning";
import * as vscode from 'vscode';
import { CloudrailRunner } from "../cloudrail_runner";

export function updateCloudrail(): void {
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: false
    }, (progress) => {
        return new Promise<void>(async (resolve) => { 
            progress.report( { increment: 10, message: 'Updating Cloudrail...'});

            CloudrailRunner.updateCloudrail()
            .then( async () => {
                Versioning.setCloudrailVersion(await CloudrailRunner.getCloudrailVersion());
                progress.report( { increment: 90, message: `Cloudrail version: ${Versioning.getCloudrailVersion()}`});
                await new Promise((resolve) => setTimeout(resolve, 2000));
                resolve();
            });
        });
    });
}