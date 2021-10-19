import * as path from 'path';
import * as vscode from 'vscode';
import * as shell from 'shelljs';
import * as fs from 'fs';
import {exec, ExecOptions, execSync} from 'child_process';
import * as util from 'util';
import { Versioning } from './versioning';


export class CloudrailUtils {
     static venvPath: string;
    private static sourceCmd: string;

    static init(venvBasePath: string): void {
        CloudrailUtils.venvPath = `${path.join(venvBasePath, 'cloudrail_venv')}`;
        CloudrailUtils.sourceCmd = `source "${CloudrailUtils.venvPath}/bin/activate"`;
    }

    static async createVenv(): Promise<void> {
        console.log('Checking if venv exists');
        if (fs.existsSync(CloudrailUtils.venvPath)) {
            console.log('Venv exists');
        } else {
            console.log('Venv does not exist, creating..');
            await util.promisify(fs.mkdir)(CloudrailUtils.venvPath, { recursive: true});
            console.log('Creating venv dir');
            await util.promisify(exec)(`python3 -m venv "${CloudrailUtils.venvPath}"`);
            console.log('Created venv');
        }
    }

    static async getCloudrailVersion(): Promise<string | undefined> {
        console.log('Attempting to get cloudrail version');
        try {
            let versionOutput = await util.promisify(exec)(`${CloudrailUtils.sourceCmd} && cloudrail --version`);
            if (versionOutput.stderr) { 
                console.log(`Unexpected error when checking cloudrail version: ${versionOutput.stderr}`);
                return Promise.reject(versionOutput.stderr);
            };
            console.log(versionOutput.stdout);
            return versionOutput.stdout;
        } catch(e) {
            console.log('Cloudrail is not installed');
            return;
        }

    }

    static async installCloudrail() {
        console.log('Installing cloudrail pip package');
        await util.promisify(exec)(`${CloudrailUtils.sourceCmd} && pip3 install cloudrail --no-input`);
        console.log('Finished installing cloudrail pip package');
    }

    static async setCloudrailVersion() {
        let version: string | undefined = await CloudrailUtils.getCloudrailVersion();
        if (version) {
            Versioning.setCloudrailVersion(version);
            console.log(Versioning.getCloudrailVersion());
        }
    }

    static async updateCloudrail(): Promise<void> {
        await util.promisify(shell.exec)(`${CloudrailUtils.sourceCmd} && pip3 install cloudrail --upgrade --no-input`);
    }
}