import vscode from 'vscode';
import os from 'os';
import { CloudrailRunner } from './cloudrail_runner';
import { cloudrailVersion } from './commands/version';
import scan from './commands/scan';
import { initializeEnvironment } from './commands/init';
import { updateCloudrail } from './commands/update';
import { logger } from './tools/logger';
import RunResultPublisher from './run_result_handlers/run_result_publisher';
import RunResultDiagnosticSubscriber from './run_result_handlers/run_result_diagnostic_subscriber';
import CloudrailSidebarProvider from './run_result_handlers/sidebar/cloudrail_sidebar_provider';


export function activate(context: vscode.ExtensionContext) {
	logger.debug('Cloudrail extension activated');
	const showPassedRuleState: boolean | undefined = context.workspaceState.get(CloudrailSidebarProvider.showPassedRuleId, true);
	vscode.commands.executeCommand('setContext', CloudrailSidebarProvider.showPassedRuleId, showPassedRuleState);

	const diagnostics = vscode.languages.createDiagnosticCollection('cloudrail');
    context.subscriptions.push(diagnostics);

	const sidebarProvider = new CloudrailSidebarProvider(context);

	const runResultPublisher = new RunResultPublisher([
		new RunResultDiagnosticSubscriber(diagnostics),
		sidebarProvider
	]);
	
	let venvBasePath = context.globalStorageUri.path;
	if (os.platform() === 'win32') {
		venvBasePath = venvBasePath.slice(1);
	}
	
	CloudrailRunner.init(venvBasePath);
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
		}),

		vscode.commands.registerCommand('cloudrail.show_passed_rules', () => {
			sidebarProvider.setShowPassedRulesMode(true);
		}),

		vscode.commands.registerCommand('cloudrail.hide_passed_rules', () => {
			sidebarProvider.setShowPassedRulesMode(false);
		}),

		vscode.commands.registerCommand('cloudrail.tests.getSidebarProvider', () => {
			return sidebarProvider;
		})
	];

	for (const command of commands) {
		context.subscriptions.push(command);
	}
}

export function deactivate() {}
