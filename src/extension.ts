import vscode from 'vscode';
import { CloudrailRunner } from './cloudrail_runner';
import { cloudrailVersion } from './commands/version';
import { scan } from './commands/scan';
import { initializeEnvironment } from './commands/init';
import { updateCloudrail } from './commands/update';
import { logger } from './tools/logger';
import { CloudrailSidebarProvider } from './sidebar/cloudrail_sidebar_provider';


export function activate(context: vscode.ExtensionContext) {
	logger.debug('Cloudrail extension activated');

	const sidebarProvider = new CloudrailSidebarProvider(context);

	const diagnostics = vscode.languages.createDiagnosticCollection('cloudrail');
    context.subscriptions.push(diagnostics);

	CloudrailRunner.init(context.globalStorageUri.path);
	initializeEnvironment(false);

	const commands = [
		vscode.commands.registerCommand('cloudrail.version', () => {
			cloudrailVersion();
		}),

		vscode.commands.registerCommand('cloudrail.scan', () => {
			scan(diagnostics, sidebarProvider);
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

	for (const command of commands) {
		context.subscriptions.push(command);
	}
}

export function deactivate() {}
