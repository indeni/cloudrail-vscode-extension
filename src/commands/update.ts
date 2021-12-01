import vscode from 'vscode';
import { Versioning } from "../tools/versioning";
import { CloudrailRunner } from "../cloudrail_runner";
import { initializeEnvironment } from "./init";

export function updateCloudrail(): void {
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: false
    }, async (progress) => {
        progress.report( { increment: 10, message: 'Updating Cloudrail...'});

        try {
            await CloudrailRunner.updateCloudrail();
            const version = Versioning.setCloudrailVersion(await CloudrailRunner.getCloudrailVersion());
            progress.report( { increment: 90, message: `Cloudrail version: ${version}`});
            await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch {
            initializeEnvironment(true);
        }
    });
}