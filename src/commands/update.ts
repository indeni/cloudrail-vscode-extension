import { Versioning } from "../tools/versioning";
import * as vscode from 'vscode';
import { CloudrailUtils } from "../tools/cloudrail_utils";

export function cloudrailUpdate(): void {
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: false
    }, (progress) => {
        return new Promise<void>(async (resolve) => { 
            progress.report( { increment: 10, message: 'Updating Cloudrail...'});

            CloudrailUtils.updateCloudrail()
            .then( async () => {
                Versioning.setCloudrailVersion(await CloudrailUtils.getCloudrailVersion());
                progress.report( { increment: 90, message: `Cloudrail version: ${Versioning.getCloudrailVersion()}`});
                await new Promise((resolve) => setTimeout(resolve, 2000));
                resolve();
            });
        });
    });
}