import { stub, restore, match } from 'sinon';
import { describe, beforeEach, it } from 'mocha';
import path = require('path');
import _ from './resources/results.json';
import * as configuration from '../../../tools/configuration';
import scan from '../../../commands/scan';
import * as init from '../../../commands/init';
import { CloudrailRunner } from '../../../cloudrail_runner';
import * as path_utils from '../../../tools/path_utils';
import { assert } from 'chai';
import RunResultPublisher from '../../../run_result_handlers/run_result_publisher';

describe('Scan unit tests', () => {
    beforeEach(() => {
        restore();
    });

    it('Successful scan, no vcs', async () => {
        // Arrange
        const apiKey = 'MyApiKey';
        const policyId = '';
        const defaultRegion = '';
        const configTerraformWorkingDirectory = '';
        stub(init, "initializeEnvironment").resolves(true);

        stubConfiguration(apiKey, policyId, defaultRegion, configTerraformWorkingDirectory, false);

        const terraformWorkingDirectory = '/Users/dev/tf-project';

        stub(path_utils, "getActiveTextEditorDirectoryInfo").resolves(
            {path: terraformWorkingDirectory, isInWorkspace: true, dirContent: [path.join(terraformWorkingDirectory, 'main.tf')]});

        // TODO: Add stub for simple-git

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
        const runResultPublisherSpy = stub(runResultPublisher);
        
        // Act
        await scan(runResultPublisher);

        // Assert
        assert.isTrue(runResultPublisherSpy.assessmentStart.calledOnce, 'assessmentStart was not called');
        assert.isTrue(runResultPublisherSpy.updateRunResults.calledOnce, 'updateRunResults was not called');
        assert.isFalse(runResultPublisherSpy.assessmentFailed.called, 'assessmentFailed was called');

        
    }).timeout(5000);

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