import vscode from 'vscode';
import { CloudrailRunner } from './cloudrail_runner';
import { cloudrailVersion } from './commands/version';
import scan from './commands/scan';
import { initializeEnvironment } from './commands/init';
import { updateCloudrail } from './commands/update';
import { logger } from './tools/logger';
import { CloudrailSidebarProvider } from './sidebar/cloudrail_sidebar_provider';
import RunResultDiagnosticSubscriber from './tools/run_result_diagnostic_subscriber';
import RunResultPublisher from './tools/run_result_publisher';


export function activate(context: vscode.ExtensionContext) {
	logger.debug('Cloudrail extension activated');
	const diagnostics = vscode.languages.createDiagnosticCollection('cloudrail');
    context.subscriptions.push(diagnostics);

	const runResultPublisher = new RunResultPublisher([
		new RunResultDiagnosticSubscriber(diagnostics),
		new CloudrailSidebarProvider(context)
	]);
	
	CloudrailRunner.init(context.globalStorageUri.path);
	initializeEnvironment(false);

	const commands = [
		vscode.commands.registerCommand('cloudrail.version', () => {
			cloudrailVersion();
		}),

		vscode.commands.registerCommand('cloudrail.scan', () => {
			scan(runResultPublisher);
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
