import vscode from 'vscode';
import path from 'path';
import simpleGit, { SimpleGitOptions } from 'simple-git';
import fs from 'fs';
import { CloudrailRunner, CloudrailRunResponse, VcsInfo } from '../cloudrail_runner';
import { getUnsetMandatoryFields, getConfig } from '../tools/configuration';
import { initializeEnvironment } from './init';
import { parseJson } from '../tools/parse_utils';
import { RuleResult } from '../cloudrail_run_result_model';
import { logger, logPath } from '../tools/logger';
import { CloudrailSidebarProvider } from '../sidebar/cloudrail_sidebar_provider';


let scanInProgress = false;


export async function scan(diagnostics: vscode.DiagnosticCollection, sidebarProvider: CloudrailSidebarProvider) {
    if (scanInProgress) {
        logger.debug('Scan in progress - exiting');
        vscode.window.showInformationMessage('Cannot run Cloudrail Scan while another scan is in progress.');
        return;
    }

    sidebarProvider.resetView();

    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            cancellable: false
        }, async(progress) => {
            scanInProgress = true;
            progress.report({ increment: 0, message: 'Starting Cloudrail run'});

            diagnostics.clear();
            let runResults: CloudrailRunResponse | undefined;
            const config = await getConfig();
            const terraformWorkingDirectory = await getTerraformWorkingDirectory();
            if (!terraformWorkingDirectory) {
                return;
            }
    
            if (!await initializeEnvironment(false)) {
                return;
            }
    
            const unsetMandatoryFields = await getUnsetMandatoryFields();
            if (unsetMandatoryFields.length > 0) {
                vscode.commands.executeCommand('workbench.action.openSettings', 'cloudrail');
                vscode.window.showErrorMessage(`The following required options are not set: ${unsetMandatoryFields.join(', ')}. Cloudrail cannot run without this information.`);
                return;
            }
            
            const vcsInfo = await getVcsInfo(terraformWorkingDirectory);
            const stdoutCallback = (data: string) => {
                progress.report({ increment: 10, message: data});
            };

            runResults = await CloudrailRunner.cloudrailRun(terraformWorkingDirectory, config.apiKey, config.cloudrailPolicyId, config.awsDefaultRegion, vcsInfo, stdoutCallback);

            if (runResults === undefined) {
                vscode.window.showErrorMessage('Cloudrail failed to start');
            } else if (!runResults.success) {
                vscode.window.showErrorMessage('Cloudrail Run failed:\n' + runResults.stdout);
                return;
            }

            progress.report({ increment: 100, message: 'Applying scan results...'});
            await handleRunResults(runResults!, diagnostics, terraformWorkingDirectory, sidebarProvider);
        });
    } catch(e) {
        logger.error(`Failed to perform scan. reason: ${e}`);
        vscode.window.showErrorMessage(`An unknown error has occured while performing the scan. Check log for more information: ${logPath}`);
    } finally {
        scanInProgress = false;
    }
}

async function handleRunResults(runResults: CloudrailRunResponse, diagnostics: vscode.DiagnosticCollection, terraformWorkingDirectory: string, sidebarProvider: CloudrailSidebarProvider): Promise<void> {
    const dataObject = await parseJson<RuleResult[]>(runResults.resultsFilePath);
    const failedRules = dataObject.filter(ruleResult => ruleResult.status === 'failed');
    
    for (const failedRule of failedRules) {
        for (const issueItem of failedRule.issue_items) {
            const iacMetadata = issueItem.violating_entity.iac_resource_metadata;
            const docPath = path.join(terraformWorkingDirectory, iacMetadata.file_name);
            const document = await vscode.workspace.openTextDocument(docPath);
            const foundDiagnostics: vscode.Diagnostic[] = [];

            const existingDiagnostics: readonly vscode.Diagnostic[] | undefined = diagnostics.get(document.uri);
            Object.assign(foundDiagnostics, existingDiagnostics);

            const startLine = iacMetadata.start_line;
    
            const startPosition = document.lineAt(startLine - 1).range.start;
            const endPosition = document.lineAt(startLine - 1).range.end;

            let severity: vscode.DiagnosticSeverity = vscode.DiagnosticSeverity.Warning;
            if (failedRule.enforcement_mode !== 'advise') {
                severity = vscode.DiagnosticSeverity.Error;
            }
    
            foundDiagnostics.push({
                message: `Issue: ${issueItem.evidence}\nFix: ${failedRule.iac_remediation_steps}`,
                range: new vscode.Range(startPosition, endPosition),
                severity: severity,
                source: 'Cloudrail ',
                code: {value: 'Assessment Page', target: vscode.Uri.parse(runResults.assessmentLink)}
            });
            
            diagnostics.set(document.uri ,foundDiagnostics);
        }
    }

    sidebarProvider.updateRunResults(failedRules, terraformWorkingDirectory, runResults.assessmentLink);
}

async function getVcsInfo(baseDir: string): Promise<VcsInfo | undefined> {
    let vcsInfo: VcsInfo | undefined = undefined;
    const options: Partial<SimpleGitOptions> = {
		baseDir: baseDir,
		binary: 'git',
	 };
	 
     try {
        const git = simpleGit(options);
        if (await git.checkIsRepo()) {
            const branch = (await git.branch()).current;
            const commit = (await git.show()).replace('\n', ' ').split(' ')[1];
            const topLevel = await git.revparse(['--show-toplevel']);
            let repo = (await git.remote(['get-url', 'origin']) as string).replace('\n', '');
            let urlTemplate = baseDir.replace(topLevel + '/', '');
            repo = repo.replace('https://', '').replace('http://', '');
            repo = repo.slice(0, -4); // Remove .git suffix
            
            let buildLink;

            if (repo.includes('@')) {
                repo = repo
                        .replace(':', '/')
                        .slice(repo.indexOf('@') + 1); // Remove everything up to (and includes) '@'
            }
 
            if (repo.startsWith('bitbucket')) {
                buildLink = 'https://' + repo + '/src/';
                if (branch.includes('/')) { // For branches like bugfix/branchname or feature/branchname
                    buildLink += commit;
                } else {
                    buildLink += branch;
                }
                urlTemplate = buildLink + `/${urlTemplate}` + '/{iac_file_path}#lines-{iac_file_line_no}';
            } else if (repo.startsWith('github')) { 
                buildLink = 'https://' + repo + '/tree/' + branch;
                urlTemplate = buildLink + `/${urlTemplate}` + '/{iac_file_path}#L{iac_file_line_no}';
            } else {
                throw new Error('Unsupported vcs for repo: ' + repo);
            }

             vcsInfo = { repo: repo, branch: branch, commit: commit, buildLink: buildLink, urlTemplate: urlTemplate };
        }
     } catch(e) {
        logger.error('An error occured when trying to get vcs info: ' + e);
     }

     return vcsInfo;
}

async function getTerraformWorkingDirectory(): Promise<string | undefined> {
    const activeEditor = vscode.window.activeTextEditor;
    const instruction = 'Open any file in the terraform module to be scanned, then run Cloudrail Scan';
    if (activeEditor) {
        const editorPath = activeEditor.document.uri.fsPath;
        const editorDirectoryPath = path.dirname(editorPath);
        if (!vscode.workspace.getWorkspaceFolder(activeEditor.document.uri)) {
            const shouldScanPromptResult = await vscode.window.showInformationMessage('This file is outside of your workspace. Continue with a Cloudrail scan?', 'Scan', 'Cancel');
            if (shouldScanPromptResult !== 'Scan') {
                return;
            }
        }

        let dirContent = fs.readdirSync(editorDirectoryPath);
        let files = dirContent.filter( (value) => {
            return value.match(/.*.tf$/);
        });
    
        if (files.length === 0) {
            vscode.window.showErrorMessage(`The current directory '${editorDirectoryPath}'' does not contain any terraform files. ${instruction}`);
            return;
        }

        return editorDirectoryPath;
    } else {
        vscode.window.showErrorMessage(instruction);
        return;
    }
}