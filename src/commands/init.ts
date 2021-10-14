import { Versioning } from "../tools/versioning";
import * as vscode from 'vscode';
import { CloudrailUtils } from "../tools/cloudrail_utils";

export function initializeEnvironment(): void {
    openSettingsIfMandatoryFieldsAreNotSet();
    CloudrailUtils.createVenv((exitCode: number) => {
        console.log(`venv creation process exited with code ${exitCode}`);
        if (exitCode !== 0) {
            vscode.window.showErrorMessage(`Venv creation failed with exit code ${exitCode}`);
            return;
        }
        
        try {
            setCloudrailVersion();
        } catch(e) { 
            try {
                CloudrailUtils.installCloudrail();
                setCloudrailVersion();
            } catch(e) {
                vscode.window.showErrorMessage(`Failed to install cloudrail - exit code: ${exitCode}\nError:${e}`);
            }
        }
    });         
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