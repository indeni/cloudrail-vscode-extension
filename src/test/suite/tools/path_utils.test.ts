import vscode from 'vscode';
import os from 'os';
import { stub, restore } from 'sinon';
import { describe, beforeEach, it } from 'mocha';
import { assert, expect } from 'chai';
import fs = require('fs');
import path = require('path');
import * as path_utils from '../../../tools/path_utils';

describe('path_utils tests', () => {
    beforeEach( () => {
        restore();
    });

    it('getActiveTextEditorDirectoryInfo - Directory with files in the workspace', async () => {
        // Arrange
        const activeTextEditorDocumentUriFsPath = '/Users/dev/tf-project/main.tf';
        const activeTextEditorUri = { fsPath: activeTextEditorDocumentUriFsPath } as vscode.Uri;
        const activeTextEditorDocument = { uri: activeTextEditorUri };
        const activeTextEditor = { document: activeTextEditorDocument };
        const expectedTerraformWorkingDirectory = path.dirname(activeTextEditorDocumentUriFsPath);

        stub(vscode.window, "activeTextEditor").value(activeTextEditor);
        stub(vscode.workspace, "getWorkspaceFolder").withArgs(activeTextEditorUri).returns({} as vscode.WorkspaceFolder);

        // @ts-ignore
        stub(fs, "readdirSync").withArgs(expectedTerraformWorkingDirectory).returns(
            // @ts-ignore
            [activeTextEditorDocumentUriFsPath]
        );

        // Act
        const activeTextEditorDirectoryInfo = await path_utils.getActiveTextEditorDirectoryInfo();

        // Assert
        assert.equal(activeTextEditorDirectoryInfo.path, expectedTerraformWorkingDirectory);
        assert.equal(activeTextEditorDirectoryInfo.isInWorkspace, true);
        expect(activeTextEditorDirectoryInfo.dirContent).to.eql([activeTextEditorDocumentUriFsPath]);
    });

    it('getActiveTextEditorDirectoryInfo - Directory with files not in the workspace', async () => {
        // Arrange
        const activeTextEditorDocumentUriFsPath = '/Users/dev/tf-project/main.tf';
        const activeTextEditorUri = { fsPath: activeTextEditorDocumentUriFsPath } as vscode.Uri;
        const activeTextEditorDocument = { uri: activeTextEditorUri };
        const activeTextEditor = { document: activeTextEditorDocument };
        const expectedTerraformWorkingDirectory = path.dirname(activeTextEditorDocumentUriFsPath);

        stub(vscode.window, "activeTextEditor").value(activeTextEditor);
        stub(vscode.workspace, "getWorkspaceFolder").withArgs(activeTextEditorUri).returns(undefined);

        // @ts-ignore
        stub(fs, "readdirSync").withArgs(expectedTerraformWorkingDirectory).returns(
            // @ts-ignore
            [activeTextEditorDocumentUriFsPath]
        );

        // Act
        const activeTextEditorDirectoryInfo = await path_utils.getActiveTextEditorDirectoryInfo();

        // Assert
        assert.equal(activeTextEditorDirectoryInfo.path, expectedTerraformWorkingDirectory);
        assert.equal(activeTextEditorDirectoryInfo.isInWorkspace, false);
        expect(activeTextEditorDirectoryInfo.dirContent).to.eql([activeTextEditorDocumentUriFsPath]);
    });

    it('getActiveTextEditorDirectoryInfo - no active text editor', async () => {
        // Arrange
        stub(vscode.window, "activeTextEditor").value(undefined);

        // Act
        const activeTextEditorDirectoryInfo = await path_utils.getActiveTextEditorDirectoryInfo();

        // Assert
        assert.isUndefined(activeTextEditorDirectoryInfo.path);
        assert.isUndefined(activeTextEditorDirectoryInfo.dirContent);
        assert.isUndefined(activeTextEditorDirectoryInfo.isInWorkspace);
    });

    it('resolvePath, absolute path', () => {
        // Arrange
        const filepath = '/absolute/path';

        // Act
        const actualFilePath = path_utils.resolvePath(filepath);

        // Assert
        assert.equal(actualFilePath, filepath);
    });

    it('resolvePath, relative path', () => {
        // Arrange
        const filepath = '../relative/path';

        // Act
        const actualFilePath = path_utils.resolvePath(filepath);

        // Assert
        assert.isUndefined(actualFilePath);
    });

    it('resolvePath, undefined path', () => {
        // Arrange
        const filepath = undefined;

        // Act
        const actualFilePath = path_utils.resolvePath(filepath);

        // Assert
        assert.equal(actualFilePath, filepath);
    });

    it('resolvePath, path with home dir', () => {
        // Arrange
        const filepath = '~/dev';
        const homeDir = '/Users/user';
        stub(os, 'homedir').returns(homeDir);

        // Act
        const actualFilePath = path_utils.resolvePath(filepath);

        // Assert
        assert.equal(actualFilePath, `${homeDir}/dev`);
    });
});