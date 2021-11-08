import { stub, restore, mock } from 'sinon';
import vscode from 'vscode';
import { describe, beforeEach, it } from 'mocha';
import { Versioning } from '../../../tools/versioning';
import * as versionCommand from '../../../commands/version';

describe('Command: Version unit tests', () => {

    beforeEach(async () => {
        restore();
    });

    it('Check cloudrailVersion output', async () => {
        // Arrange
        
        const cloudrailVersion = '1.2.3';
        const extensionVersion = '4.5.6';

        stub(Versioning, "getCloudrailVersion").returns(cloudrailVersion);
        stub(Versioning, 'getExtensionVersion').returns(extensionVersion);

        const showInformationMessageExpectation = mock(vscode.window)
            .expects("showInformationMessage")
            .withArgs(
                `Cloudrail Version: ${cloudrailVersion}\nExtension Version: ${extensionVersion}`, {modal:true}
            );

        // Act
        versionCommand.cloudrailVersion();

        // Assert
        showInformationMessageExpectation.verify();
    });
});