import * as path from 'path';
import * as vscode from 'vscode';
import * as shell from 'shelljs';
import {execSync} from 'child_process';


export class CloudrailUtils {
    private static readonly venvPath: string = path.join(vscode.workspace.workspaceFolders![0].uri.path, 'cloudrail_venv');
    private static readonly sourceCmd: string = `source ${CloudrailUtils.venvPath}/bin/activate`;

    static createVenv(callback: (exitCode: number) => void) {
        let venvProc = shell.exec(`python3 -m venv ${CloudrailUtils.venvPath}`, {async: true});

        venvProc.stderr?.on('data', (data) => {
            vscode.window.showErrorMessage(`Venv creation output an error: ${data}`);
        });

        venvProc.on('close', callback);
    }

    // Throws exception when cloudrail does not exist
    static getCloudrailVersion() {
        return execSync(`${CloudrailUtils.sourceCmd} && cloudrail --version`, { encoding: 'utf8'});
    }

    static installCloudrail() {
        execSync(`${CloudrailUtils.sourceCmd} && pip3 install cloudrail --no-input`, { encoding: 'utf8'});
    }
}