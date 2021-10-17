import * as path from 'path';
import * as vscode from 'vscode';
import * as shell from 'shelljs';
import * as fs from 'fs';
import {execSync} from 'child_process';


export class CloudrailUtils {
    private static venvPath: string;
    private static sourceCmd: string;

    static init(venvBasePath: string): void {
        CloudrailUtils.venvPath = `${path.join(venvBasePath, 'cloudrail_venv')}`;
        CloudrailUtils.sourceCmd = `source "${CloudrailUtils.venvPath}/bin/activate"`;
    }

    static createVenv(callback: (exitCode: number) => void) {
        
        fs.stat(CloudrailUtils.venvPath, (error, stats) => {
            if (error) {
                fs.mkdirSync(CloudrailUtils.venvPath, { recursive: true });
                let venvProc = shell.exec(`python3 -m venv "${CloudrailUtils.venvPath}"`, {async: true});

                venvProc.stderr?.on('data', (data) => {
                    vscode.window.showErrorMessage(`Venv creation output an error: ${data}`);
                });
        
                venvProc.on('close', callback);
            } else {
                callback(0);
            }
        });
    }

    // Throws exception when cloudrail does not exist
    static getCloudrailVersion() {
        return execSync(`${CloudrailUtils.sourceCmd} && cloudrail --version`, { encoding: 'utf8'});
    }

    static installCloudrail() {
        execSync(`${CloudrailUtils.sourceCmd} && pip3 install cloudrail --no-input`, { encoding: 'utf8'});
    }

    static updateCloudrail(callback: (exitCode: number) => void) {
        let proc = shell.exec(`${CloudrailUtils.sourceCmd} && pip3 install cloudrail --upgrade --no-input`, {async: true});

        proc.on('close', callback);
    }
}