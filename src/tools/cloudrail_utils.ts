import * as path from 'path';
import * as fs from 'fs';
import {exec} from 'child_process';
import * as util from 'util';
import { Versioning } from './versioning';


export class CloudrailUtils {
    private static venvPath: string;
    private static sourceCmd: string;

    static init(venvBasePath: string): void {
        CloudrailUtils.venvPath = `${path.join(venvBasePath, 'cloudrail_venv')}`;
        CloudrailUtils.sourceCmd = `source "${CloudrailUtils.venvPath}/bin/activate"`;
    }

    static async createVenv(): Promise<void> {
        console.log('Checking if venv exists');
        if (await CloudrailUtils.venvExists() && await CloudrailUtils.isPipInstalledInVenv()) {
            console.log('Venv exists');
        } else {
            console.log('Venv does not exist, creating..');
            await util.promisify(fs.mkdir)(CloudrailUtils.venvPath, { recursive: true });
            console.log('Creating venv dir');
            await CloudrailUtils.asyncExec(`python3 -m venv "${CloudrailUtils.venvPath}"`);
            console.log('Created venv');
        }
    }

    static async getCloudrailVersion(): Promise<string | undefined> {
        try {
            let versionOutput = await CloudrailUtils.runCloudrail(`--version`);
            if (versionOutput.stderr) { 
                console.log(`Unexpected error when checking cloudrail version: ${versionOutput.stderr}`);
                return Promise.reject(versionOutput.stderr);
            };

            return versionOutput.stdout;
        } catch(e) {
            console.log('Cloudrail is not installed');
            return;
        }
    }

    static async installCloudrail(): Promise<void> {
        console.log('Installing cloudrail pip package');
        await CloudrailUtils.runVenvPip('install cloudrail --no-input');
        console.log('Finished installing cloudrail pip package');
    }

    static async setCloudrailVersion(): Promise<void> {
        let version: string | undefined = await CloudrailUtils.getCloudrailVersion();
        if (version) {
            Versioning.setCloudrailVersion(version);
        }
    }

    static async updateCloudrail(): Promise<void> {
        console.log('Updating cloudrail');
        await CloudrailUtils.runVenvPip('install cloudrail --upgrade --no-input');
        console.log('Cloudrail updated');
    }

    private static asyncExec(command: string): Promise<{stdout: string, stderr: string}> {
        return util.promisify(exec)(command);
    }

    static async isPythonInstalled(): Promise<boolean> {
        try {
            const version = (await CloudrailUtils.asyncExec('python3 --version')).stdout.split(' ')[1];
            return version.startsWith('3.8') || version.startsWith('3.9');
        } catch {
            return false;
        }
    }

    private static async venvExists(): Promise<boolean> {
        try {
            await CloudrailUtils.asyncExec(CloudrailUtils.sourceCmd);
            return true;
        } catch {
            return false;
        }
    }

    private static async isPipInstalledInVenv(): Promise<boolean> {
        try {
            await CloudrailUtils.runVenvPip('--version');
            return true;
        } catch {
            return false;
        }
    }

    private static async runVenvPip(command: string): Promise<{stdout: string, stderr: string}> {
        return await CloudrailUtils.asyncExec(`${CloudrailUtils.sourceCmd} && python3 -m pip ${command}`);
    }

    private static async runCloudrail(command: string): Promise<{stdout: string, stderr: string}> {
        return await CloudrailUtils.asyncExec(`${CloudrailUtils.sourceCmd} && cloudrail ${command}`);
    }
}