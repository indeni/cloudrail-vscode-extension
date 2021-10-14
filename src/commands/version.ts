import { exec, ExecException } from 'child_process';
import * as vscode from 'vscode';

export function cloudrailVersion(): void {

    exec('cloudrail --version', (error: ExecException | null, stdout: string, stderr: string) => {
        if (error) {
            console.log(`error: ${error.message}`);
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
        }
        const extensionVersion = vscode.extensions.getExtension("Cloudrail.cloudrail-iac-scanning")?.packageJSON['version'];
        vscode.window.showInformationMessage(`${stdout}\nextension, version ${extensionVersion}`, {modal:true});
    });
    
    
}