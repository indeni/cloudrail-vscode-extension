import { stub, restore, SinonStub } from 'sinon';
import { assert } from 'chai';
import vscode from 'vscode';
import { getConfig, getUnsetMandatoryFields } from '../../../tools/configuration';
import { describe, beforeEach, afterEach, it } from 'mocha';
import { CloudrailRunner } from '../../../cloudrail_runner';

describe('Configuration unit tests', () => {
    let getConfigurationStub: SinonStub<any>;
    let getApiKeyStub: SinonStub<any>;

    beforeEach(() => {
        restore();
        getConfigurationStub = stub(vscode.workspace, 'getConfiguration');
        getApiKeyStub = stub(CloudrailRunner, 'getApiKey');
    });

    afterEach(() => {
        getConfigurationStub.restore();
        getApiKeyStub.restore();
    });

    it('Configuration specified in the settings page', async () => {
        // Arrange
        getConfigurationStub.withArgs('cloudrail').returns({
            get: (_s: string) => {
                if (_s === 'ApiKey')            { return 'MyApiKey'; }
                if (_s === 'CloudrailPolicyId') { return 'MyCloudrailPolicyId'; }
                if (_s === 'AwsDefaultRegion')  { return 'MyAwsDefaultRegion'; }
            },
          } as vscode.WorkspaceConfiguration);

            // Act
            const config = await getConfig();

            // Assert
            assert.equal(config.apiKey, 'MyApiKey');
            assert.equal(config.cloudrailPolicyId, 'MyCloudrailPolicyId');
            assert.equal(config.awsDefaultRegion, 'MyAwsDefaultRegion');
    });

    it('Get ApiKey from CloudrailRunner', async () => {
        // Arrange
        getConfigurationStub.withArgs('cloudrail').returns({
            get: (_s: string) => {},
          } as vscode.WorkspaceConfiguration);

          getApiKeyStub.withArgs().resolves('ApiKeyFromCloudRunner');

        // Act
        const config = await getConfig();

        // Assert
        assert.equal(config.apiKey, 'ApiKeyFromCloudRunner');
    });

    it('getUnsetMandatoryFields - ApiKey is not set', async() => {
        // Arrange
        getConfigurationStub.withArgs('cloudrail').returns({
            get: (_s: string) => {},
            } as vscode.WorkspaceConfiguration);

        getApiKeyStub.withArgs().resolves('');

        // Act
        const unsetMandatoryFields = await getUnsetMandatoryFields();
        
        // Assert
        assert.lengthOf(unsetMandatoryFields, 1);
        assert.equal(unsetMandatoryFields[0], 'ApiKey');
    });

    it('getUnsetMandatoryFields - ApiKey is set', async() => {
        // Arrange
        getConfigurationStub.withArgs('cloudrail').returns({
            get: (_s: string) => {
                if (_s === 'ApiKey') { return 'MyApiKey'; }
            },
            } as vscode.WorkspaceConfiguration);

        // Act
        const unsetMandatoryFields = await getUnsetMandatoryFields();
        
        // Assert
        assert.lengthOf(unsetMandatoryFields, 0);
    });
});
