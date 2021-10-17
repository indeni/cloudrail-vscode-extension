import { Versioning } from "../tools/versioning";
import * as vscode from 'vscode';
import { CloudrailUtils } from "../tools/cloudrail_utils";

export function cloudrailUpdate(): void {
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: false
    }, (progress) => {
        const p = new Promise<void>(resolve => { 
            progress.report( { increment: 10, message: 'Updating Cloudrail...'});
            
            CloudrailUtils.updateCloudrail((exitCode) => {
                Versioning.setCloudrailVersion(CloudrailUtils.getCloudrailVersion());
                console.log(`Cloudrail updated to version ${Versioning.getCloudrailVersion()}`);
                resolve();
            });
            
        });
        
        return p;
    });
}