/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import { CloudrailRunner, CloudrailRunResponse } from '../cloudrail_runner';
import { getUnsetMandatoryFields, getConfig } from '../tools/configuration';
import { initializeEnvironment } from './init';
import * as fs from 'fs';
import * as util from 'util';
import * as path from 'path';


interface IacResourceMetadata {
    file_name: string;
    start_line: number;
    end_line: number;
}


interface IacEntity {
    iac_resource_metadata: IacResourceMetadata;
}


interface IssueItem {
    evidence: string;
    exposed_entity: IacEntity;
    violating_entity: IacEntity;
}


interface RuleResultJson {
    rule_name: string;
    status: string;
    enforcement_mode: string;
    iac_remediation_steps: string;
    issue_items: IssueItem[];
}


let scanInProgress = false;

export async function scan(diagnostics: vscode.DiagnosticCollection) {
    if (scanInProgress) {
        vscode.window.showInformationMessage('Cannot run Cloudrail Scan while another scan is in progress.');
        return;
    }

    const unsetMandatoryFields = getUnsetMandatoryFields();
    if (unsetMandatoryFields.length > 0) {
        vscode.commands.executeCommand('workbench.action.openSettings', 'cloudrail');
        vscode.window.showErrorMessage(`The following required options are not set: ${unsetMandatoryFields.join(', ')}. Cloudrail cannot run without this information.`);
        return;
    }

    if (!await initializeEnvironment(true)) {
        return;
    }

    diagnostics.clear();
    let runResults: CloudrailRunResponse;
    let stdout = '';
    const config = getConfig();
    scanInProgress = true;

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: false
    }, async (progress) => {

        return new Promise<void>(async resolve => {
            console.log('starting cloudrail run');
            progress.report({ increment: 0, message: 'Starting cloudrail run'});

            runResults = await CloudrailRunner.cloudrailRun(config.terraformWorkingDirectory!, config.apiKey!, config.cloudAccountId, config.cloudrailPolicyId, config.awsDefaultRegion,
                (data: string) => {
                    stdout += data;
                    progress.report({ increment: 10, message: data});
            });
            
            resolve();
        });
    }).then( async () => {
        if (!runResults.success) {
            vscode.window.showErrorMessage('Cloudrail Run failed:\n' + runResults.stdout);
            return;
        }

        const fileContent = await util.promisify(fs.readFile)(runResults.resultsFilePath, {encoding: 'utf-8'});
        const dataObject: RuleResultJson[] = JSON.parse(fileContent);
        
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

        scanInProgress = false;
    });
}