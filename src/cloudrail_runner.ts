import * as path from 'path';
import * as fs from 'fs';
import {exec} from 'child_process';
import * as util from 'util';
import { Versioning } from './tools/versioning';
import * as shell from 'shelljs';
import * as os from 'os';
import { logger } from './tools/logger';


export interface CloudrailRunResponse {
    resultsFilePath: string;
    success: boolean;
    stdout: string;
    assessmentLink: string;
}


export interface VcsInfo {
    repo: string;
    branch: string;
    commit: string;
    buildLink: string;
}

export class CloudrailRunner {
    private static venvPath: string;
    private static sourceCmd: string;

    static init(venvBasePath: string): void {
        this.venvPath = `${path.join(venvBasePath, 'cloudrail_venv')}`;
        this.sourceCmd = `source "${this.venvPath}/bin/activate"`;
    }

    static async createVenv(): Promise<void> {
        logger.info('Checking if venv exists');
        if (await this.venvExists() && await this.isPipInstalledInVenv()) {
            logger.info('Venv exists');
        } else {
            logger.info('Venv does not exist, creating..');
            await util.promisify(fs.mkdir)(this.venvPath, { recursive: true });
            logger.info('Creating venv dir');
            await this.asyncExec(`python3 -m venv "${this.venvPath}"`);
            logger.info('Created venv');
        }
    }

    static async getCloudrailVersion(): Promise<string | undefined> {
        try {
            let versionOutput = await this.runCloudrail(`--version`);
            if (versionOutput.stderr) { 
                logger.error(`Unexpected error when checking cloudrail version: ${versionOutput.stderr}`);
                return Promise.reject(versionOutput.stderr);
            };

            return versionOutput.stdout;
        } catch(e) {
            logger.info('Cloudrail is not installed');
            return;
        }
    }

    static async installCloudrail(): Promise<void> {
        logger.info('Installing cloudrail pip package');
        await this.runVenvPip('install cloudrail --no-input');
        logger.info('Finished installing cloudrail pip package');
    }

    static async setCloudrailVersion(): Promise<void> {
        let version: string | undefined = await this.getCloudrailVersion();
        if (version) {
            Versioning.setCloudrailVersion(version);
        }
    }

    static async updateCloudrail(): Promise<void> {
        logger.info('Updating cloudrail');
        await this.runVenvPip('install cloudrail --upgrade --no-input');
        logger.info('Cloudrail updated');
    }

    static async cloudrailRun(workingDir: string, 
                              apiKey: string,
                              cloudrailPolicyId: string | undefined,
                              awsDefaultRegion: string | undefined,
                              vcsInfo: VcsInfo | undefined,
                              onStdoutCallback: (data: string) => void): Promise<CloudrailRunResponse> {

        let stdout = '';
        let success: boolean = false;
        let assessmentLink = '';
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudrail_tmp')); 
        const resultsFilePath = path.join(tempDir, 'results.json');
        
        let runArgs = [
            '--auto-approve',
            //'--client vscode',
            '--output-format json',
            '--notty',
            '--upload-log',
            `--output-file ${resultsFilePath}`,
            `--directory ${workingDir}`,
            `--api-key ${apiKey}`,
            `--no-cloud-account`,
            '--execution-source-identifier VSCode'
        ];

        if (cloudrailPolicyId) {
            runArgs.push(`--policy-id ${cloudrailPolicyId}`);
        }

        if (awsDefaultRegion) {
            runArgs.push(`--aws-default-region ${awsDefaultRegion}`);
        }

        if (vcsInfo) {
            runArgs.push(`--vcs-id ${vcsInfo.repo}/${vcsInfo.branch}/${vcsInfo.commit.substring(0, 7)}`);
            runArgs.push(`--build-link ${vcsInfo.buildLink}`);
        }

        let running = true;
        const runCommand = `${CloudrailRunner.sourceCmd} && cloudrail run ${runArgs.join(' ')}`;
        this.logRunCommand(runCommand);
        const run = shell.exec(runCommand, { async: true });

        run.stdout?.on('data', (data: string) => {
            logger.info(`Cloudrail run stdout: ${data}`);
            stdout += data;
            let match = data.match(/https:\/\/(web\.[a-z-.]*cloudrail\.app\/environments\/assessments\/[0-9A-Fa-f]{8}(?:-[0-9A-Fa-f]{4}){3}-[0-9A-Fa-f]{12})/g);
            if (match) {
                assessmentLink = match[0];
            }
            onStdoutCallback(data);
        });

        run.stderr?.on('data', (data: string) => {
            logger.info(`Cloudrail run stderr: ${data}`);
        });

        run.on('close', (exitCode) => {
            success = exitCode === 0;
            running = false;
            logger.info(`cloudrail run finished with exit code ${exitCode}`);
        });

        while (running) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        if (success) {
            logger.info('resultsFile: ' + resultsFilePath);('Cloudrail run results saved to: ' + resultsFilePath);
        }
        
        return {resultsFilePath: resultsFilePath, success: success, stdout: stdout, assessmentLink: assessmentLink}; 
    }

    private static asyncExec(command: string): Promise<{stdout: string, stderr: string}> {
        logger.info(`asyncExec command: ${command}`);
        return util.promisify(exec)(command);
    }

    static async isPythonInstalled(): Promise<boolean> {
        try {
            const version = (await this.asyncExec('python3 --version')).stdout.split(' ')[1];
            logger.debug(`Response from running "python3 --version": ${version}`);
            return version.startsWith('3.8') || version.startsWith('3.9');
        } catch {
            logger.info('Python is not installed');
            return false;
        }
    }

    private static async venvExists(): Promise<boolean> {
        try {
            await this.asyncExec(this.sourceCmd);
            return true;
        } catch {
            return false;
        }
    }

    private static async isPipInstalledInVenv(): Promise<boolean> {
        try {
            await this.runVenvPip('--version');
            return true;
        } catch {
            return false;
        }
    }

    private static async runVenvPip(command: string): Promise<{stdout: string, stderr: string}> {
        return await this.asyncExec(`${this.sourceCmd} && python3 -m pip ${command}`);
    }

    private static async runCloudrail(command: string): Promise<{stdout: string, stderr: string}> {
        return await this.asyncExec(`${this.sourceCmd} && cloudrail ${command}`);
    }

    private static logRunCommand(command: string): void {
        const logPrefix = 'Cloudrail Run command:';
        const splitted = command.split(' ');
        const index2 = splitted.indexOf('--api-key');

        if (index2 === -1) {
            logger.info(`${logPrefix} ${command}`);
        } else {
            splitted[index2+1] = '****';
            logger.info(`${logPrefix} ${splitted.join(' ')}`);
        }
    }
}