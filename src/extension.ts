// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { cloudrailVersion } from './commands/version';
import { scan } from './commands/scan';
import { initializeEnvironment } from './commands/init';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "cloudrail-iac-scanning" is now active!');
	
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json

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
			initializeEnvironment();
		})
	];

	for (let command of commands) {
		context.subscriptions.push(command);
	}
}

// this method is called when your extension is deactivated
export function deactivate() {}
