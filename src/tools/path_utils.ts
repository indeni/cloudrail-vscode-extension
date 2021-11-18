import vscode from 'vscode';
import { dirname, isAbsolute } from 'path';
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
        const editorDirectoryPath = dirname(editorPath);
        const isInWorkspace = vscode.workspace.getWorkspaceFolder(activeEditor.document.uri) !== undefined;
        let dirContent = fs.readdirSync(editorDirectoryPath);
        return {path: editorDirectoryPath, isInWorkspace: isInWorkspace, dirContent};
    } else {
        return {};
    }
}

export function resolvePath(path: string | undefined): string | undefined {
    if (!path) {
        return;
    }

    const dir = resolveHomeDir(path);
    if (isAbsolute(dir!)) {
        return dir;
    }

    return;
}