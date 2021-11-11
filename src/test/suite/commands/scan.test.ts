import vscode from 'vscode';
import sinon, { stub, restore, match, spy } from 'sinon';
import { describe, beforeEach, it } from 'mocha';
import { assert } from 'chai';
import fs = require('fs');
import path = require('path');
import _ from './resources/results.json';
import * as configuration from '../../../tools/configuration';
import { scan } from '../../../commands/scan';
import * as init from '../../../commands/init';
import { CloudrailRunner } from '../../../cloudrail_runner';
import { CloudrailSidebarProvider } from '../../../sidebar/cloudrail_sidebar_provider';

describe('Scan unit tests', () => {
    beforeEach(() => {
        restore();
    });

    it('Successful scan, no vcs', async () => {
        // Arrange
        const apiKey = 'MyApiKey';
        const policyId = '';
        const defaultRegion = '';
        stub(configuration, "getConfig").resolves(
            {apiKey: apiKey, 
            cloudrailPolicyId: policyId, 
            awsDefaultRegion: defaultRegion});

        const activeTextEditorDocumentUriFsPath = '/Users/dev/tf-project/main.tf';
        const terraformWorkingDirectory = path.dirname(activeTextEditorDocumentUriFsPath);
        const activeTextEditorUri = { fsPath: activeTextEditorDocumentUriFsPath } as vscode.Uri;
        const activeTextEditorDocument = { uri: activeTextEditorUri };
        const activeTextEditor = { document: activeTextEditorDocument };

        stub(vscode.window, "activeTextEditor").value(activeTextEditor);
        stub(vscode.workspace, "getWorkspaceFolder").withArgs(activeTextEditorUri).returns(
            {} as vscode.WorkspaceFolder);

        // @ts-ignore
        stub(fs, "readdirSync").withArgs(terraformWorkingDirectory).returns(
            // @ts-ignore
            [activeTextEditorDocumentUriFsPath]
        );

        stub(init, "initializeEnvironment").resolves(true);
        stub(configuration, "getUnsetMandatoryFields").resolves([]);

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

        const firstIssueTerraformFilePath = path.join(terraformWorkingDirectory, "main.tf");
        const firstIssueTerraformFileUri = { fsPath: firstIssueTerraformFilePath } as vscode.Uri;
        const secondIssueTerraformFilePath = path.join(terraformWorkingDirectory, "modules", "vpc_module", "main.tf");
        const secondIssueTerraformFileUri = { fsPath: secondIssueTerraformFilePath } as vscode.Uri;
        stub(vscode.workspace, "openTextDocument")
            // @ts-ignore
            .withArgs(firstIssueTerraformFilePath)
            .resolves({
                uri: firstIssueTerraformFileUri,
                // @ts-ignore
                lineAt: (_: number) => {
                    return { range: {
                        start: new vscode.Position(5, 10),
                        end: new vscode.Position(5, 15)
                    }};
                }
            })
            // @ts-ignore
            .withArgs(secondIssueTerraformFilePath)
            .resolves({
                uri: secondIssueTerraformFileUri,
                // @ts-ignore
                lineAt: (_: number) => {
                    return { range: {
                        start: new vscode.Position(5, 10),
                        end: new vscode.Position(5, 15)
                    }};
                }
            });

        const diagnostics = vscode.languages.createDiagnosticCollection('test-diagnostics');
        const diagnosticSpy = spy(diagnostics, "set");

        stub(diagnostics, "get").returns(undefined);

        const cloudrailSidebarProviderStub = stub(CloudrailSidebarProvider);
        stub(cloudrailSidebarProviderStub.prototype, 'scanInProgressView').returns();
        stub(cloudrailSidebarProviderStub.prototype, 'resetView').returns();
        
        // Act
        await scan(diagnostics, cloudrailSidebarProviderStub.prototype);

        // Assert
        // @ts-ignore
        sinon.assert.calledWithMatch(diagnosticSpy, firstIssueTerraformFileUri, match.any); 
        // @ts-ignore
        sinon.assert.calledWithMatch(diagnosticSpy, secondIssueTerraformFileUri, match.any);

        
    }).timeout(100000);

});