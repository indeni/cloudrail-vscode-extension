import vscode from 'vscode';
import path from 'path';
import fs from 'fs';
import { homedir } from 'os';

export function resolveHomeDir(filepath: string | undefined): string | undefined {
    if (filepath) {
        if (filepath[0] === '~') {
            return filepath.replace('~', homedir());
        }
    }

    return filepath;
}

export async function getActiveTextEditorDirectoryInfo(): Promise<{path?: string, isInWorkspace?: boolean, dirContent?: string[]}> {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        const editorPath = activeEditor.document.uri.fsPath;
        const editorDirectoryPath = path.dirname(editorPath);
        const isInWorkspace = vscode.workspace.getWorkspaceFolder(activeEditor.document.uri) !== undefined;
        let dirContent = fs.readdirSync(editorDirectoryPath);
        return {path: editorDirectoryPath, isInWorkspace: isInWorkspace, dirContent};
    } else {
        return {}
    }
}