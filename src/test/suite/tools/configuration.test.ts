import vscode from 'vscode';
import { stub, restore, SinonStub } from 'sinon';
import { assert } from 'chai';
import { describe, beforeEach, afterEach, it } from 'mocha';
import { getConfig, getUnsetMandatoryFields } from '../../../tools/configuration';
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
            get: (settingId: string) => {
                if (settingId === 'ApiKey')            { return 'MyApiKey'; }
                if (settingId === 'CloudrailPolicyId') { return 'MyCloudrailPolicyId'; }
                if (settingId === 'AwsDefaultRegion')  { return 'MyAwsDefaultRegion'; }
                if (settingId === 'TerraformWorkingDirectory')  { return 'MyTerraformWorkingDirectory'; }
            },
          } as vscode.WorkspaceConfiguration);

        // Act
        const config = await getConfig();

        // Assert
        assert.equal(config.apiKey, 'MyApiKey');
        assert.equal(config.cloudrailPolicyId, 'MyCloudrailPolicyId');
        assert.equal(config.awsDefaultRegion, 'MyAwsDefaultRegion');
        assert.equal(config.terraformWorkingDirectory, 'MyTerraformWorkingDirectory');
    });

    it('Get ApiKey from CloudrailRunner', async () => {
        // Arrange
        getConfigurationStub.withArgs('cloudrail').returns({
            get: (settingId: string) => {},
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
            get: (settingId: string) => {},
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
            get: (settingId: string) => {
                if (settingId === 'ApiKey') { return 'MyApiKey'; }
            },
            } as vscode.WorkspaceConfiguration);

        // Act
        const unsetMandatoryFields = await getUnsetMandatoryFields();
        
        // Assert
        assert.lengthOf(unsetMandatoryFields, 0);
    });
});
