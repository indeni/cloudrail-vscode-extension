// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { CloudrailRunner } from './cloudrail_runner';
import { cloudrailVersion } from './commands/version';
import { scan } from './commands/scan';
import { initializeEnvironment } from './commands/init';
import { updateCloudrail } from './commands/update';
import { logger } from './tools/logger';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	logger.debug('Cloudrail extension activated');

	const diagnostics = vscode.languages.createDiagnosticCollection('cloudrail');
    context.subscriptions.push(diagnostics);

	CloudrailRunner.init(context.globalStorageUri.path);
	initializeEnvironment(false);

	const commands = [
		vscode.commands.registerCommand('cloudrail.version', () => {
			cloudrailVersion();
		}),

		vscode.commands.registerCommand('cloudrail.scan', () => {
			scan(diagnostics);
		}),

		vscode.commands.registerCommand('cloudrail.settings', () => {
			vscode.commands.executeCommand('workbench.action.openSettings', 'cloudrail');
		}),

		vscode.commands.registerCommand('cloudrail.init', async () => {
			initializeEnvironment(true);
		}),

		vscode.commands.registerCommand('cloudrail.update', () => {
			updateCloudrail();
		})
	];

	for (let command of commands) {
		context.subscriptions.push(command);
	}
}

// this method is called when your extension is deactivated
export function deactivate() {}
