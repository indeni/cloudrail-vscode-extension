import vscode from 'vscode';
import { stub, restore, match } from 'sinon';
import { describe, beforeEach, it } from 'mocha';
import path = require('path');
import _ from './resources/results.json';
import * as configuration from '../../../tools/configuration';
import scan from '../../../commands/scan';
import * as init from '../../../commands/init';
import { CloudrailRunner } from '../../../cloudrail_runner';
import * as pathUtils from '../../../tools/path_utils';
import { assert } from 'chai';
import RunResultPublisher from '../../../run_result_handlers/run_result_publisher';
import * as vcsUtils from '../../../tools/vcs_utils';
import { logger } from '../../../tools/logger';

describe('Scan unit tests', () => {
    beforeEach(() => {
        restore();
    });

    it('Successful scan, tf working dir from active editor', async () => {
        // Arrange
        const apiKey = 'MyApiKey';
        const policyId = 'policyId';
        const defaultRegion = 'defaultRegion';
        const configTerraformWorkingDirectory = '';
        const terraformWorkingDirectory = '/Users/dev/tf-project';
        const runResultPublisher = new RunResultPublisher([]);
        const runResultPublisherStub = stub(runResultPublisher);

        stubConfiguration(apiKey, policyId, defaultRegion, configTerraformWorkingDirectory, false);
        stub(init, "awaitInitialization").resolves();
        stub(pathUtils, "getActiveTextEditorDirectoryInfo").resolves(
            {path: terraformWorkingDirectory, isInWorkspace: true, dirContent: [path.join(terraformWorkingDirectory, 'main.tf')]});
        stub(vcsUtils, "getVcsInfo").resolves();
        stub(CloudrailRunner, "cloudrailRun").withArgs(
            terraformWorkingDirectory,
            apiKey,
            policyId,
            defaultRegion,
            undefined,
            match.any
        ).resolves({
            resultsFilePath: path.join(__dirname, 'resources', 'results.json'),
            success: true,
            stdout: '',
            assessmentLink: 'https://assessment.link'
        });

        // Act
        await scan(runResultPublisher);

        // Assert
        assert.isTrue(runResultPublisherStub.assessmentStart.calledOnce, 'assessmentStart was not called');
        assert.isTrue(runResultPublisherStub.updateRunResults.calledOnce, 'updateRunResults was not called');
        assert.isFalse(runResultPublisherStub.assessmentFailed.called, 'assessmentFailed was called');
    });

    it('Successful scan, tf working dir from config', async () => {
        // Arrange
        const apiKey = 'MyApiKey';
        const policyId = 'policyId';
        const defaultRegion = 'defaultRegion';
        const terraformWorkingDirectory = '/Users/dev/tf-project';

        stubConfiguration(apiKey, policyId, defaultRegion, terraformWorkingDirectory, false);
        stub(init, "awaitInitialization").resolves();
        stub(vcsUtils, "getVcsInfo").resolves();
        stub(CloudrailRunner, "cloudrailRun").withArgs(
            terraformWorkingDirectory,
            apiKey,
            policyId,
            defaultRegion,
            undefined,
            match.any
        ).resolves({
            resultsFilePath: path.join(__dirname, 'resources', 'results.json'),
            success: true,
            stdout: '',
            assessmentLink: 'https://assessment.link'
        });

        const runResultPublisher = new RunResultPublisher([]);
        const runResultPublisherStub = stub(runResultPublisher);
        
        // Act
        await scan(runResultPublisher);

        // Assert
        assert.isTrue(runResultPublisherStub.assessmentStart.calledOnce, 'assessmentStart was not called');
        assert.isTrue(runResultPublisherStub.updateRunResults.calledOnce, 'updateRunResults was not called');
        assert.isFalse(runResultPublisherStub.assessmentFailed.called, 'assessmentFailed was called');
    });

    it('Failed scan, has unset mandatory fields', async () => {
        // Arrange
        const apiKey = '';
        const policyId = 'policyId';
        const defaultRegion = 'defaultRegion';
        const terraformWorkingDirectory = '/Users/dev/tf-project';

        stubConfiguration(apiKey, policyId, defaultRegion, terraformWorkingDirectory, true);
        const cloudrailRunStub = stub(CloudrailRunner, 'cloudrailRun');
        const executeCommandStub = stub(vscode.commands, 'executeCommand');
        const showErrorMessageStub = stub(vscode.window, 'showErrorMessage');
        const runResultPublisher = new RunResultPublisher([]);
        const runResultPublisherStub = stub(runResultPublisher);
        
        // Act
        await scan(runResultPublisher);

        // Assert
        assert.isTrue(runResultPublisherStub.assessmentStart.calledOnce, 'assessmentStart was not called');
        assert.isFalse(runResultPublisherStub.updateRunResults.calledOnce, 'updateRunResults was called');
        assert.isTrue(runResultPublisherStub.assessmentFailed.called, 'assessmentFailed was not called');
        assert.isFalse(cloudrailRunStub.called, 'cloudrailRun was called');
        assert.isTrue(executeCommandStub.calledOnceWith('workbench.action.openSettings', 'cloudrail'), 'command workbench.action.openSettings was not called');
        // @ts-ignore
        assert.isTrue(showErrorMessageStub.calledOnceWith('The following required options are not set: ApiKey. Cloudrail cannot run without this information.'), "showErrorMessage not called");
    });

    it('Failed scan, cloudrailRun fails', async () => {
        // Arrange
        const apiKey = 'MyApiKey';
        const policyId = 'policyId';
        const defaultRegion = 'defaultRegion';
        const terraformWorkingDirectory = '/Users/dev/tf-project';
        const cloudrailRunStdout = 'stdout';

        stubConfiguration(apiKey, policyId, defaultRegion, terraformWorkingDirectory, false);
        stub(init, "awaitInitialization").resolves();
        stub(vcsUtils, "getVcsInfo").resolves();
        stub(CloudrailRunner, "cloudrailRun").resolves({
            resultsFilePath: '',
            success: false,
            stdout: cloudrailRunStdout,
            assessmentLink: ''
        });
        const showErrorMessageStub = stub(vscode.window, "showErrorMessage");

        const runResultPublisher = new RunResultPublisher([]);
        const runResultPublisherStub = stub(runResultPublisher);
        
        // Act
        await scan(runResultPublisher);

        // Assert
        assert.isTrue(runResultPublisherStub.assessmentStart.calledOnce, 'assessmentStart was not called');
        assert.isFalse(runResultPublisherStub.updateRunResults.calledOnce, 'updateRunResults was called');
        assert.isTrue(runResultPublisherStub.assessmentFailed.called, 'assessmentFailed was not called');
        // @ts-ignore
        assert.isTrue(showErrorMessageStub.calledOnceWith(`Cloudrail Run failed:\n${cloudrailRunStdout}`), 'showErrorMessage not called');
    });

    it('Failed scan, cloudrailRun rejected unexpectedly', async () => {
        // Arrange
        const apiKey = 'MyApiKey';
        const policyId = 'policyId';
        const defaultRegion = 'defaultRegion';
        const terraformWorkingDirectory = '/Users/dev/tf-project';
        const cloudrailRunError = new Error('error-message');

        stubConfiguration(apiKey, policyId, defaultRegion, terraformWorkingDirectory, false);
        stub(init, "awaitInitialization").resolves();
        stub(vcsUtils, "getVcsInfo").resolves();
        stub(CloudrailRunner, "cloudrailRun").rejects(cloudrailRunError);
        stub(CloudrailRunner, "getCloudrailVersion").resolves('1.2.3');
        const showErrorMessageStub = stub(vscode.window, "showErrorMessage");
        const loggerStub = stub(logger, "exception");
        const initializeEnvironmentStub = stub(init, "initializeEnvironment");
        initializeEnvironmentStub.resolves();
        
        const runResultPublisher = new RunResultPublisher([]);
        const runResultPublisherStub = stub(runResultPublisher);
        
        // Act
        await scan(runResultPublisher);

        // Assert
        assert.isTrue(runResultPublisherStub.assessmentStart.calledOnce, 'assessmentStart was not called');
        assert.isFalse(runResultPublisherStub.updateRunResults.calledOnce, 'updateRunResults was called');
        assert.isTrue(runResultPublisherStub.assessmentFailed.called, 'assessmentFailed was not called');
        // @ts-ignore
        assert.isTrue(loggerStub.calledOnceWith(cloudrailRunError, 'Failed to perform scan'), 'logger.error was not called');
        assert.isFalse(initializeEnvironmentStub.called, 'initalizeEnvironment was called');
        // @ts-ignore
        assert.isTrue(showErrorMessageStub.calledOnceWith('An unknown error has occured while performing the scan. Please try again.'), 'showErrorMessage was not called');
    });

    it('Failed scan, cloudrailRun rejected, cloudrail not installed', async () => {
        // Arrange
        const apiKey = 'MyApiKey';
        const policyId = 'policyId';
        const defaultRegion = 'defaultRegion';
        const terraformWorkingDirectory = '/Users/dev/tf-project';
        const cloudrailRunError = new Error('error-message');

        stubConfiguration(apiKey, policyId, defaultRegion, terraformWorkingDirectory, false);
        stub(init, "awaitInitialization").resolves();
        stub(vcsUtils, "getVcsInfo").resolves();
        stub(CloudrailRunner, "cloudrailRun").rejects(cloudrailRunError);
        stub(CloudrailRunner, "getCloudrailVersion").resolves();
        const showErrorMessageStub = stub(vscode.window, "showErrorMessage");
        const loggerStub = stub(logger, "exception");
        const initializeEnvironmentStub = stub(init, "initializeEnvironment");
        initializeEnvironmentStub.resolves();
        
        const runResultPublisher = new RunResultPublisher([]);
        const runResultPublisherStub = stub(runResultPublisher);
        
        // Act
        await scan(runResultPublisher);

        // Assert
        assert.isTrue(runResultPublisherStub.assessmentStart.calledOnce, 'assessmentStart was not called');
        assert.isFalse(runResultPublisherStub.updateRunResults.calledOnce, 'updateRunResults was called');
        assert.isTrue(runResultPublisherStub.assessmentFailed.called, 'assessmentFailed was not called');
        // @ts-ignore
        assert.isTrue(loggerStub.calledOnceWith(cloudrailRunError, 'Failed to perform scan'), 'logger.error was not called');
        assert.isTrue(initializeEnvironmentStub.called, 'initalizeEnvironment was not called');
        // @ts-ignore
        assert.isTrue(showErrorMessageStub.calledOnceWith('An unknown error has occured while performing the scan. Please try again.'), 'showErrorMessage was not called');
    });

    it('Failed scan, cloudrailRun rejected, unexpected failure on getCloudrailVersion', async () => {
        // Arrange
        const apiKey = 'MyApiKey';
        const policyId = 'policyId';
        const defaultRegion = 'defaultRegion';
        const terraformWorkingDirectory = '/Users/dev/tf-project';
        const cloudrailRunError = new Error('error-message');

        stubConfiguration(apiKey, policyId, defaultRegion, terraformWorkingDirectory, false);
        stub(init, "awaitInitialization").resolves();
        stub(vcsUtils, "getVcsInfo").resolves();
        stub(CloudrailRunner, "cloudrailRun").rejects(cloudrailRunError);
        stub(CloudrailRunner, "getCloudrailVersion").rejects();
        const showErrorMessageStub = stub(vscode.window, "showErrorMessage");
        const loggerStub = stub(logger, "exception");
        const initializeEnvironmentStub = stub(init, "initializeEnvironment");
        initializeEnvironmentStub.resolves();
        
        const runResultPublisher = new RunResultPublisher([]);
        const runResultPublisherStub = stub(runResultPublisher);
        
        // Act
        await scan(runResultPublisher);

        // Assert
        assert.isTrue(runResultPublisherStub.assessmentStart.calledOnce, 'assessmentStart was not called');
        assert.isFalse(runResultPublisherStub.updateRunResults.calledOnce, 'updateRunResults was called');
        assert.isTrue(runResultPublisherStub.assessmentFailed.called, 'assessmentFailed was not called');
        // @ts-ignore
        assert.isTrue(loggerStub.calledOnceWith(cloudrailRunError, 'Failed to perform scan'), 'logger.error was not called');
        assert.isTrue(initializeEnvironmentStub.called, 'initalizeEnvironment was not called');
        // @ts-ignore
        assert.isTrue(showErrorMessageStub.calledOnceWith('An unknown error has occured while performing the scan. Please try again.'), 'showErrorMessage was not called');
    });

    function stubConfiguration(apiKey: string, cloudrailPolicyId: string, defaultRegion: string, terraformWorkingDirectory: string, withUnsetMandatoryFields: boolean) {
        stub(configuration, "getConfig").resolves(
            {apiKey: apiKey, 
            cloudrailPolicyId: cloudrailPolicyId, 
            awsDefaultRegion: defaultRegion,
            terraformWorkingDirectory: terraformWorkingDirectory});
        const unsetMandatoryFields = withUnsetMandatoryFields ? ['ApiKey'] : [];
        stub(configuration, "getUnsetMandatoryFields").resolves(unsetMandatoryFields);
    }
});