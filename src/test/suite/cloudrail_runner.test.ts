
import Sinon, { mock, restore, stub } from 'sinon';
import { assert } from 'chai';
import { CloudrailRunner, CloudrailRunResponse, VcsInfo } from '../../cloudrail_runner';
import { Versioning } from '../../tools/versioning';
import util from 'util';
import fs from 'fs';
import os from 'os';
import { exec } from 'child_process';
import shell from 'shelljs';
import child from "child_process";


describe('cloudrail_runner tests', () => {
    const unixVenvPath = '/venvBasePath/cloudrail_venv';
    const unixSourceCmd = `source "${unixVenvPath}/bin/activate"`;
    const windowsVenvPath = 'C:/venvBasePath/cloudrail_venv';
    const windowsSourceCmd = `${windowsVenvPath}/Scripts/activate.bat`;
    let execMap: Map<string, { stdout: string, stderr: string }> = new Map<string, { stdout: string, stderr: string }>();
    let promisifyStub: Sinon.SinonStub;
    let platformStub: Sinon.SinonStub;

    function stubExec(): void {
        const execFunc = async (cmd: string) => {
            if (execMap.has(cmd)) {
                return execMap.get(cmd);
            }

            throw new Error();
        };

        promisifyStub.withArgs(exec).returns(execFunc);
    }

    beforeEach(async () => {
        restore();
        platformStub = stub(os, "platform");
        platformStub.returns("linux");
        CloudrailRunner.init('/venvBasePath');
        Versioning.resetCloudrailVersion();
        promisifyStub = stub(util, "promisify");
        execMap.set('python3 --version', { stdout: 'Python 3.9.0', stderr: '' });
        stubExec();
        await CloudrailRunner.initPythonAlias();
        execMap.clear();
    });

    it('createVenv, venv already exists', async () => {
        // Arrange
        execMap.set(unixSourceCmd, { stdout: '', stderr: ''});
        execMap.set(`${unixSourceCmd} && python3 -m pip --version`, { stdout: '', stderr: ''});
        stubExec();

        // Act
        const result = await CloudrailRunner.createVenv();

        // Assert
        assert.isTrue(result);
    });

    it('createVenv, venv already exists but pip not installed in venv', async () => {
        // Arrange
        execMap.set(unixSourceCmd, { stdout: '', stderr: ''});
        execMap.set(`python3 -m venv "${unixVenvPath}"`, { stdout: '', stderr: ''});
        stubExec();
        promisifyStub.withArgs(fs.mkdir).returns( (path: any, options: any) => {});

        // Act
        const result = await CloudrailRunner.createVenv();

        // Assert
        assert.isFalse(result);
    });

    it('getCloudrailVersion, cloudrail not installed', async () => {
        // Arrange
        stubExec();
        // Act
        const result = await CloudrailRunner.getCloudrailVersion();

        // Assert
        assert.isUndefined(result);
    });

    it('getCloudrailVersion, cloudrail installed locally and not on venv. non-windows machine', async () => {
        // Arrange
        execMap.set(`${unixSourceCmd} && which cloudrail`, {stdout: '/random/path/cloudrail', stderr: ''});
        stubExec();

        // Act
        const result = await CloudrailRunner.getCloudrailVersion();

        // Assert
        assert.isUndefined(result);
    });

    it('getCloudrailVersion, cloudrail installed locally and not on venv. windows machine', async () => {
        // Arrange
        platformStub.returns("win32");
        CloudrailRunner.init('C:/venvBasePath');
        execMap.set(`${windowsSourceCmd} && where cloudrail`, {stdout: 'C:\\random\\path\\cloudrail', stderr: ''});
        stubExec();

        // Act
        const result = await CloudrailRunner.getCloudrailVersion();

        // Assert
        assert.isUndefined(result);
    });

    it('getCloudrailVersion, cloudrail installed on venv. non-windows machine', async () => {
        // Arrange
        const output = 'cloudrail, version 1.2.3';
        execMap.set(`${unixSourceCmd} && cloudrail --version`, {stdout: output, stderr: ''});
        execMap.set(`${unixSourceCmd} && which cloudrail`, {stdout: `${unixVenvPath}/cloudrail`, stderr: ''});
        stubExec();

        // Act
        const result = await CloudrailRunner.getCloudrailVersion();

        // Assert
        assert.equal(result, output);
    });

    it('getCloudrailVersion, cloudrail installed on venv. windows machine', async () => {
        // Arrange
        platformStub.returns("win32");
        CloudrailRunner.init('C:/venvBasePath');
        const output = 'cloudrail, version 1.2.3';
        execMap.set(`${windowsSourceCmd} && cloudrail --version`, { stdout: output, stderr: '' });
        execMap.set(`${windowsSourceCmd} && where cloudrail`, { stdout: `${windowsVenvPath}\\cloudrail`, stderr: '' });
        stubExec();

        // Act
        const result = await CloudrailRunner.getCloudrailVersion();

        // Assert
        assert.equal(result, output);
    });

    it('installCloudrail', async () => {
        // Arrange
        execMap.set(`${unixSourceCmd} && python3 -m pip install cloudrail --upgrade --no-input`, {stdout: '', stderr: ''});
        execMap.set(`${unixSourceCmd} && cloudrail --version`, {stdout: 'cloudrail, version 1.2.3', stderr: ''});
        execMap.set(`${unixSourceCmd} && which cloudrail`, {stdout: `${unixVenvPath}/cloudrail`, stderr: ''});
        stubExec();

        // Act
        const result = await CloudrailRunner.installCloudrail();

        // Assert
        assert.equal(result, '1.2.3');
        assert.equal(result, Versioning.getCloudrailVersion());
    });

    it('setCloudrailVersion, cloudrail installed', async () => {
        // Arrange
        execMap.set(`${unixSourceCmd} && cloudrail --version`, {stdout: 'cloudrail, version 1.2.3', stderr: ''});
        execMap.set(`${unixSourceCmd} && which cloudrail`, {stdout: `${unixVenvPath}/cloudrail`, stderr: ''});
        stubExec();

        // Act
        const result = await CloudrailRunner.setCloudrailVersion();

        // Assert
        assert.equal(result, '1.2.3');
        assert.equal(result, Versioning.getCloudrailVersion());
    });

    it('setCloudrailVersion, cloudrail not installed', async () => {
        // Arrange
        stubExec();
        // Act
        const result = await CloudrailRunner.setCloudrailVersion();

        // Assert
        assert.equal(result, 'Not installed');
        assert.equal(Versioning.getCloudrailVersion(), 'Not installed');
    });

    it('setCloudrailVersion, set manual version', async () => {
        // Act
        const result = await CloudrailRunner.setCloudrailVersion('cloudrail, version 1.2.3');

        // Assert
        assert.equal(result, '1.2.3');
        assert.equal(Versioning.getCloudrailVersion(), '1.2.3');
    });

    it('getApiKey, cloudrail installed, registered user. non-windows machine', async () => {
        // Arrange
        execMap.set(`${unixSourceCmd} && cloudrail config info | grep api_key`, {stdout: 'api_key: theapikey\n', stderr: ''});
        stubExec();

        // Act
        const result = await CloudrailRunner.getApiKey();

        // Assert
        assert.equal(result, 'theapikey');
    });

    it('getApiKey, cloudrail installed, registered user. windows machine', async () => {
        // Arrange
        platformStub.returns("win32");
        CloudrailRunner.init('C:/venvBasePath');
        execMap.set(`${windowsSourceCmd} && cloudrail config info | findstr api_key`, {stdout: 'api_key: theapikey\n', stderr: ''});
        stubExec();

        // Act
        const result = await CloudrailRunner.getApiKey();

        // Assert
        assert.equal(result, 'theapikey');
    });

    it('getApiKey, cloudrail installed, unregistered user. non-windows machine', async () => {
        // Arrange
        execMap.set(`${unixSourceCmd} && cloudrail config info | grep api_key`, {stdout: '', stderr: ''});
        stubExec();

        // Act
        const result = await CloudrailRunner.getApiKey();

        // Assert
        assert.equal(result, '');
    });

    it('getApiKey, cloudrail installed, unregistered user. windows machine', async () => {
        // Arrange
        platformStub.returns("win32");
        CloudrailRunner.init('C:/venvBasePath');
        execMap.set(`${windowsSourceCmd} && cloudrail config info | findstr api_key`, {stdout: '', stderr: ''});
        stubExec();

        // Act
        const result = await CloudrailRunner.getApiKey();

        // Assert
        assert.equal(result, '');
    });

    it('getApiKey, cloudrail not installed', async () => {
        // Arrange
        stubExec();

        // Act
        const result = await CloudrailRunner.getApiKey();

        // Assert
        assert.equal(result, '');
    });

    it('initPythonAlias, supported version:python3.8 installed', async () => {
        // Arrange
        execMap.set(`python3 --version`, {stdout: 'Python 3.8.6', stderr: ''});
        stubExec();

        // Act
        const result = await CloudrailRunner.initPythonAlias();

        // Assert
        assert.isTrue(result);
    });

    it('initPythonAlias, supported version:python3.9 installed', async () => {
        // Arrange
        execMap.set(`python3 --version`, {stdout: 'Python 3.9.4', stderr: ''});
        stubExec();

        // Act
        const result = await CloudrailRunner.initPythonAlias();

        // Assert
        assert.isTrue(result);
    });

    it('initPythonAlias, unsupported version:python3.7 installed', async () => {
        // Arrange
        execMap.set(`python3 --version`, {stdout: 'Python 3.7.0', stderr: ''});
        stubExec();

        // Act
        const result = await CloudrailRunner.initPythonAlias();

        // Assert
        assert.isFalse(result);
    });

    it('initPythonAlias, python not installed', async () => {
        // Arrange
        stubExec();

        // Act
        const result = await CloudrailRunner.initPythonAlias();

        // Assert
        assert.isFalse(result);
    });

    it('isCloudrailVersionSatisfactory', () => {
        ['1.3.835', '1.3.8', '1.2.5', '0.3.836', '0.3.900'].forEach( (value) => {
            const result = CloudrailRunner.isCloudrailVersionSatisfactory(value);

            assert.isFalse(result);
        });

        ['1.3.836', '1.3.837', '2.0.0', '2.3.835'].forEach( (value) => {
            const result = CloudrailRunner.isCloudrailVersionSatisfactory(value);

            assert.isTrue(result);
        });
    });

    it('venvExists, exists', async () => {
        // Arrange
        execMap.set(unixSourceCmd, {stdout: '', stderr: ''});
        stubExec();

        // Act
        const result = await CloudrailRunner.venvExists();

        // Assert
        assert.isTrue(result);
    });

    it('venvExists, doesnt exist', async () => {
        // Arrange
        stubExec();

        // Act
        const result = await CloudrailRunner.venvExists();

        // Assert
        assert.isFalse(result);
    });

    it('isPipInstalledInVenv, not installed', async () => {
        // Arrange
        stubExec();

        // Act
        const result = await CloudrailRunner.isPipInstalledInVenv();

        // Assert
        assert.isFalse(result);
    });

    it('isPipInstalledInVenv, installed', async () => {
        // Arrange
        execMap.set(`${unixSourceCmd} && python3 -m pip --version`, {stdout: 'pip 20.2.3 from /Library/Frameworks/Python.framework/Versions/3.9/lib/python3.9/site-packages/pip (python 3.9)', stderr: ''});
        stubExec();

        // Act
        const result = await CloudrailRunner.isPipInstalledInVenv();

        // Assert
        assert.isTrue(result);
    });

    it('cloudrailRun, minimal run. successful', async () => {
        // Arrange
        stub(fs, "mkdtempSync").returns('/tmp/cloudrail_tmp');
        stub(Versioning, "getExtensionVersion").returns('1.2.3');
        const workingDir = '/workingDir';
        const apiKey = 'apikey';
        const outputFile = '/tmp/cloudrail_tmp/results.json';

        const runArgs = [
            '--auto-approve',
            '--output-format json',
            '--notty',
            '--upload-log',
            `--output-file ${outputFile}`,
            `--directory ${workingDir}`,
            `--api-key ${apiKey}`,
            `--no-cloud-account`,
            '--execution-source-identifier VSCode',
            `--client vscode:${Versioning.getExtensionVersion()}`
        ];

        const assessmentLink = 'https://web.develop.cloudrail.app/environments/assessments/772ddd98-b6ea-4ab1-aefa-18d63408370d';
        const stdout = `stdout with assessment link ${assessmentLink}`;
        const childProcessStub = {
            send: stub().returnsThis(),
            on: stub()
              .returnsThis()
              .yields(0),
            stdout: {
                on: stub()
                    .returnsThis()
                    .yields(stdout)
            }
        };
        

        const shellStub = stub(shell, "exec");
        // @ts-ignore
        shellStub.returns(childProcessStub);

        const result: CloudrailRunResponse = await CloudrailRunner.cloudrailRun(workingDir, apiKey, '', '', undefined, (data: string) => {});

        assert.isTrue(shellStub.calledOnceWith(`${unixSourceCmd} && cloudrail run ${runArgs.join(' ')}`, {async: true}));
        assert.equal(result.assessmentLink, assessmentLink);
        assert.equal(result.resultsFilePath, outputFile);
        assert.equal(result.stdout, stdout);
        assert.isTrue(result.success);
    });

    it('cloudrailRun, with policy-id, aws-default-region, and vcs info. successful run', async () => {
        // Arrange
        stub(fs, "mkdtempSync").returns('/tmp/cloudrail_tmp');
        stub(Versioning, "getExtensionVersion").returns('1.2.3');
        const workingDir = '/workingDir';
        const apiKey = 'apikey';
        const outputFile = '/tmp/cloudrail_tmp/results.json';
        const policyId = 'policy-id';
        const awsDefaultRegion = 'us-east-1';
        const vcsInfo: VcsInfo = {
            repo: 'repo',
            branch: 'branch',
            commit: '123456789',
            buildLink: 'buildLink',
            urlTemplate: 'urlTemplate'
        };

        const runArgs = [
            '--auto-approve',
            '--output-format json',
            '--notty',
            '--upload-log',
            `--output-file ${outputFile}`,
            `--directory ${workingDir}`,
            `--api-key ${apiKey}`,
            `--no-cloud-account`,
            '--execution-source-identifier VSCode',
            `--client vscode:${Versioning.getExtensionVersion()}`,
            `--policy-id ${policyId}`,
            `--aws-default-region ${awsDefaultRegion}`,
            `--vcs-id ${vcsInfo.repo}/${vcsInfo.branch}/${vcsInfo.commit.substring(0, 7)}`,
            `--build-link ${vcsInfo.buildLink}`,
            `--iac-url-template ${vcsInfo?.urlTemplate}`
        ];

        const assessmentLink = 'https://web.develop.cloudrail.app/environments/assessments/772ddd98-b6ea-4ab1-aefa-18d63408370d';
        const stdout = `stdout with assessment link ${assessmentLink}`;
        const childProcessStub = {
            send: stub().returnsThis(),
            on: stub()
              .returnsThis()
              .yields(0),
            stdout: {
                on: stub()
                    .returnsThis()
                    .yields(stdout)
            }
        };
        

        const shellStub = stub(shell, "exec");
        // @ts-ignore
        shellStub.returns(childProcessStub);

        const result: CloudrailRunResponse = await CloudrailRunner.cloudrailRun(workingDir, apiKey, policyId, awsDefaultRegion, vcsInfo, (data: string) => {});

        assert.isTrue(shellStub.calledOnceWith(`${unixSourceCmd} && cloudrail run ${runArgs.join(' ')}`, {async: true}));
        assert.equal(result.assessmentLink, assessmentLink);
        assert.equal(result.resultsFilePath, outputFile);
        assert.equal(result.stdout, stdout);
        assert.isTrue(result.success);
    });

    it('cloudrailRun, minimal run. run failed', async () => {
        // Arrange
        stub(fs, "mkdtempSync").returns('/tmp/cloudrail_tmp');
        stub(Versioning, "getExtensionVersion").returns('1.2.3');
        const workingDir = '/workingDir';
        const apiKey = 'apikey';
        const outputFile = '/tmp/cloudrail_tmp/results.json';

        const runArgs = [
            '--auto-approve',
            '--output-format json',
            '--notty',
            '--upload-log',
            `--output-file ${outputFile}`,
            `--directory ${workingDir}`,
            `--api-key ${apiKey}`,
            `--no-cloud-account`,
            '--execution-source-identifier VSCode',
            `--client vscode:${Versioning.getExtensionVersion()}`
        ];

        const assessmentLink = 'https://web.develop.cloudrail.app/environments/assessments/772ddd98-b6ea-4ab1-aefa-18d63408370d';
        const stdout = `stdout with assessment link ${assessmentLink}`;
        const childProcessStub = {
            send: stub().returnsThis(),
            on: stub()
              .returnsThis()
              .yields(2),
            stdout: {
                on: stub()
                    .returnsThis()
                    .yields(stdout)
            }
        };
        

        const shellStub = stub(shell, "exec");
        // @ts-ignore
        shellStub.returns(childProcessStub);

        const result: CloudrailRunResponse = await CloudrailRunner.cloudrailRun(workingDir, apiKey, '', '', undefined, (data: string) => {});

        assert.isTrue(shellStub.calledOnceWith(`${unixSourceCmd} && cloudrail run ${runArgs.join(' ')}`, {async: true}));
        assert.equal(result.assessmentLink, assessmentLink);
        assert.equal(result.resultsFilePath, outputFile);
        assert.equal(result.stdout, stdout);
        assert.isFalse(result.success);
    });
});