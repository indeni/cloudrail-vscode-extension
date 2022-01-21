import path from 'path';
import fs from 'fs';
import semver from 'semver';
import { exec } from 'child_process';
import util from 'util';
import { Versioning } from './tools/versioning';
import shell from 'shelljs';
import os from 'os';
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
    urlTemplate: string;
}

export class CloudrailRunner {
    private static venvPath: string;
    private static sourceCmd: string;
    private static readonly minimumCliVersion: string = '1.3.836';
    private static pythonAlias: string;

    static init(venvBasePath: string): void {
        this.venvPath = `${path.join(venvBasePath, 'cloudrail_venv')}`;
        if (os.platform() === 'win32') {
            this.sourceCmd = `${this.venvPath}/Scripts/activate.bat`;
        } else {
            this.sourceCmd = `source "${this.venvPath}/bin/activate"`;
        }
    }

    static async createVenv(): Promise<boolean> {
        logger.info('Checking if venv exists');
        if (await this.venvExists() && await this.isPipInstalledInVenv()) {
            logger.info('Venv exists');
            return true;
        } else {
            logger.info('Venv does not exist, creating..');
            await util.promisify(fs.mkdir)(this.venvPath, { recursive: true });
            logger.info('Creating venv dir');
            await this.asyncExec(`${CloudrailRunner.pythonAlias} -m venv "${this.venvPath}"`);
            logger.info('Created venv');
            return false;
        }
    }

    static async getCloudrailVersion(): Promise<string | undefined> {
        try {
            let versionOutput = await this.runCloudrail(`--version`);
            if (versionOutput.stderr) { 
                logger.error(`Unexpected error when checking cloudrail version: ${versionOutput.stderr}`);
                return Promise.reject(versionOutput.stderr);
            };

            let cloudrailPathCommand = os.platform() === 'win32' ? 'where cloudrail' : 'which cloudrail';
            let cloudrailInstallPath = await this.runVenvCommand(cloudrailPathCommand);
            if (!cloudrailInstallPath.stdout.startsWith(this.venvPath)) {
                return;
            }

            return versionOutput.stdout;
        } catch(e) {
            logger.info('Cloudrail is not installed');
            return;
        }
    }

    static async installCloudrail(): Promise<string> {
        logger.info('Installing cloudrail pip package');
        await this.runVenvPip('install cloudrail --upgrade --no-input');
        logger.info('Finished installing cloudrail pip package');
        return this.setCloudrailVersion();
    }

    static async setCloudrailVersion(version?: string): Promise<string> {
        if (!version) {
            version = await this.getCloudrailVersion();
        }

        if (version) {
            Versioning.setCloudrailVersion(version);
        }

        return Versioning.getCloudrailVersion();
    }

    static async updateCloudrail(): Promise<void> {
        logger.info('Updating cloudrail');
        await this.runVenvPip('install cloudrail --upgrade --no-input');
        logger.info('Cloudrail updated');
    }

    static async cloudrailRun(workingDir: string, 
                              apiKey: string,
                              cloudrailPolicyId: string,
                              awsDefaultRegion: string,
                              vcsInfo: VcsInfo | undefined,
                              onStdoutCallback: (data: string) => void): Promise<CloudrailRunResponse> {

        let stdout = '';
        let success: boolean = false;
        let assessmentLink = '';
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudrail_tmp')); 
        const resultsFilePath = path.join(tempDir, 'results.json');
        
        let runArgs = [
            '--auto-approve',
            '--output-format json',
            '--notty',
            '--upload-log',
            `--output-file ${resultsFilePath}`,
            `--directory ${workingDir}`,
            `--api-key ${apiKey}`,
            `--no-cloud-account`,
            '--execution-source-identifier VSCode',
            `--client vscode:${Versioning.getExtensionVersion()}`
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
            runArgs.push(`--iac-url-template ${vcsInfo?.urlTemplate}`);
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
            success = exitCode === 0 || exitCode === 1;
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

    static async getApiKey(): Promise<string> {
        try {
            const getApiKeyCmd = os.platform() === 'win32' ? 'config info | findstr api_key' : 'config info | grep api_key';  
            const apiKeyPair = await this.runCloudrail(getApiKeyCmd);
            return apiKeyPair.stdout.split(' ')[1].replace('\n', '').replace('\r', '');
        } catch {
            return '';
        }
    }

    static async initPythonAlias(): Promise<boolean> {
        for (const alias of ['py', 'python', 'python3', 'Python']) {
            try {
                const version = (await this.asyncExec(`${alias} --version`)).stdout.split(' ')[1];
                logger.debug(`Response from running "${alias} --version": ${version}`);
                if (version.startsWith('3.8') || version.startsWith('3.9')) {
                    CloudrailRunner.pythonAlias = alias;
                    return true;
                }
            } catch {}
        }

        logger.info('Python is not installed');
        return false;
    }

    static isCloudrailVersionSatisfactory(version: string): boolean {
        try {
            return semver.gte(version, this.minimumCliVersion);
        } catch {
            return false;
        }
        
    }

    static async venvExists(): Promise<boolean> {
        try {
            await this.asyncExec(this.sourceCmd);
            return true;
        } catch  {
            return false;
        }
    }

    static async isPipInstalledInVenv(): Promise<boolean> {
        try {
            await this.runVenvPip('--version');
            return true;
        } catch {
            return false;
        }
    }

    private static asyncExec(command: string): Promise<{stdout: string, stderr: string}> {
        logger.info(`asyncExec command: ${command}`);
        return util.promisify(exec)(command);
    }

    private static async runVenvPip(command: string): Promise<{stdout: string, stderr: string}> {
        return await this.runVenvCommand(`${CloudrailRunner.pythonAlias} -m pip ${command}`);
    }

    private static async runCloudrail(command: string): Promise<{stdout: string, stderr: string}> {
        return await this.runVenvCommand(`cloudrail ${command}`);
    }

    private static async runVenvCommand(command: string): Promise<{stdout: string, stderr: string}> {
        return await this.asyncExec(`${this.sourceCmd} && ${command}`);
    }

    private static logRunCommand(command: string): void {
        const logPrefix = 'Cloudrail Run command:';
        const splitted = command.split(' ');
        const index = splitted.indexOf('--api-key');

        if (index === -1) {
            logger.info(`${logPrefix} ${command}`);
        } else {
            splitted[index+1] = splitted[index+1].slice(0, 4) + '*******';
            logger.info(`${logPrefix} ${splitted.join(' ')}`);
        }
    }
}