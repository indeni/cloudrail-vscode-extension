import * as vscode from 'vscode';
import { CloudrailRunner, CloudrailRunResponse, VcsInfo } from '../cloudrail_runner';
import { getUnsetMandatoryFields, getConfig } from '../tools/configuration';
import { initializeEnvironment } from './init';
import * as path from 'path';
import { parseJson } from '../tools/parse_utils';
import { RuleResult } from '../cloudrail_run_result_model';
import { logger } from '../tools/logger';
import simpleGit, {SimpleGit, SimpleGitOptions} from 'simple-git';


let scanInProgress = false;


export async function scan(diagnostics: vscode.DiagnosticCollection) {
    if (scanInProgress) {
        logger.debug('Scan in progress - exiting');
        vscode.window.showInformationMessage('Cannot run Cloudrail Scan while another scan is in progress.');
        return;
    }

    const unsetMandatoryFields = getUnsetMandatoryFields();
    if (unsetMandatoryFields.length > 0) {
        vscode.commands.executeCommand('workbench.action.openSettings', 'cloudrail');
        vscode.window.showErrorMessage(`The following required options are not set: ${unsetMandatoryFields.join(', ')}. Cloudrail cannot run without this information.`);
        return;
    }

    diagnostics.clear();
    let runResults: CloudrailRunResponse;
    let stdout = '';
    const config = getConfig();
    scanInProgress = true;
    const onScanEnd = () => { scanInProgress = false; };

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: false
    }, async (progress) => {
        progress.report({ increment: 0, message: 'Starting Cloudrail run'});

        if (!await initializeEnvironment(false)) {
            return;
        }
        
        const vcsInfo = await getVcsInfo(config.terraformWorkingDirectory!);
        runResults = await CloudrailRunner.cloudrailRun(config.terraformWorkingDirectory, config.apiKey, config.cloudrailPolicyId, config.awsDefaultRegion, vcsInfo,
            (data: string) => {
                stdout += data;
                progress.report({ increment: 10, message: data});
        });
    }).then( async () => {
        if (runResults === undefined) {
            vscode.window.showErrorMessage('Cloudrail failed to start');
        }
        if (!runResults.success) {
            vscode.window.showErrorMessage('Cloudrail Run failed:\n' + runResults.stdout);
            return;
        }

        await handleRunResults(runResults, diagnostics);
    }, onScanEnd
    ).then( 
        onScanEnd, 
        (reject: any) => {
            onScanEnd();
            logger.error(reject);
        } 
    );
}

async function handleRunResults(runResults: CloudrailRunResponse, diagnostics: vscode.DiagnosticCollection): Promise<void> {
    const config = getConfig();
    const dataObject = await parseJson<RuleResult[]>(runResults.resultsFilePath);
    const failedRules = dataObject.filter(ruleResult => ruleResult.status === 'failed');
    

    for (let failedRule of failedRules) {
        for (let issueItem of failedRule.issue_items) {
            const iacMetadata = issueItem.violating_entity.iac_resource_metadata;
            let docPath = path.join(config.terraformWorkingDirectory!, iacMetadata.file_name);
            let document = await vscode.workspace.openTextDocument(docPath);
            let foundDiagnostics: vscode.Diagnostic[] = [];

            let existingDiagnostics: readonly vscode.Diagnostic[] | undefined = diagnostics.get(document.uri);
            Object.assign(foundDiagnostics, existingDiagnostics);

            let startLine = iacMetadata.start_line;
    
            let startPos = document.lineAt(startLine - 1).range.start;
            let endPos = document.lineAt(startLine - 1).range.end;

            let severity: vscode.DiagnosticSeverity = vscode.DiagnosticSeverity.Warning;
            if (failedRule.enforcement_mode !== 'advise') {
                severity = vscode.DiagnosticSeverity.Error;
            }
    
            foundDiagnostics.push({
                message: issueItem.evidence + '\n\n' + failedRule.iac_remediation_steps,
                range: new vscode.Range(startPos, endPos),
                severity: severity,
                source: 'Cloudrail ',
                code: {value: 'Assessment Page', target: vscode.Uri.parse(runResults.assessmentLink)}
            });
            
            diagnostics.set(document.uri ,foundDiagnostics);
        }
    }
}

async function getVcsInfo(baseDir: string): Promise<VcsInfo | undefined> {
    let vcsInfo: VcsInfo | undefined = undefined;
    const options: Partial<SimpleGitOptions> = {
		baseDir: baseDir,
		binary: 'git',
	 };
	 
     try {
        const git: SimpleGit = simpleGit(options);
        if (await git.checkIsRepo()) {
            const branch = (await git.branch()).current;
            const commit = (await git.show()).replace('\n', ' ').split(' ')[1];
            let repo = (await git.remote(['get-url', 'origin']) as string).replace('\n', '');
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
                    buildLink += `${commit}/?at=${branch}`;
                } else {
                    buildLink += branch;
                }
            } else if (repo.startsWith('github')) { 
                buildLink = 'https://' + repo + '/tree/' + branch;
            } else {
                throw new Error('Unsupported vcs for repo: ' + repo);
            }

            vcsInfo = { repo: repo, branch: branch, commit: commit, buildLink: buildLink };
        }
     } catch(e) {
        logger.error('An error occured when trying to get vcs info: ' + e);
     }

     return vcsInfo;
}