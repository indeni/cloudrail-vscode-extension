// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { CloudrailUtils } from './tools/cloudrail_utils';
import { cloudrailVersion } from './commands/version';
import { scan } from './commands/scan';
import { initializeEnvironment } from './commands/init';
import { updateCloudrail } from './commands/update';


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "cloudrail-iac-scanning" is now active!');
	CloudrailUtils.init(context.globalStorageUri.path);
	initializeEnvironment(false, false);

	const commands = [
		vscode.commands.registerCommand('cloudrail.version', () => {
			cloudrailVersion();
		}),

		vscode.commands.registerCommand('cloudrail.scan', () => {
			scan();
		}),

		vscode.commands.registerCommand('cloudrail.settings', () => {
			vscode.commands.executeCommand('workbench.action.openSettings', 'cloudrail');
		}),

		vscode.commands.registerCommand('cloudrail.init', () => {
			initializeEnvironment(true, true);
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
