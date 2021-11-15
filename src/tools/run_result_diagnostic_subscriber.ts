import vscode from 'vscode';
import path from 'path';
import { CloudrailRunResponse } from '../cloudrail_runner';
import { RuleResult } from '../cloudrail_run_result_model';
import { RunResultsSubscriber } from '../run_result_subscriber';
import { EvidenceFormat, parseEvidence } from './parse_utils';

export default class RunResultDiagnosticSubscriber implements RunResultsSubscriber{
    constructor(private diagnostics: vscode.DiagnosticCollection) {}

    async assessmentStart(): Promise<void> {
        this.diagnostics.clear();
    }

    async assessmentFailed(): Promise<void> {}

    async updateRunResults(runResults: CloudrailRunResponse, ruleResults: RuleResult[], terraformWorkingDirectory: string): Promise<void> {
        const failedRules = ruleResults.filter(ruleResult => ruleResult.status === 'failed');
        
        for (const failedRule of failedRules) {
            for (const issueItem of failedRule.issue_items) {
                const iacMetadata = issueItem.violating_entity.iac_resource_metadata;
                const docPath = path.join(terraformWorkingDirectory, iacMetadata.file_name);
                const document = await vscode.workspace.openTextDocument(docPath);
                const foundDiagnostics: vscode.Diagnostic[] = [];
    
                const existingDiagnostics: readonly vscode.Diagnostic[] | undefined = this.diagnostics.get(document.uri);
                Object.assign(foundDiagnostics, existingDiagnostics);
    
                const startLine = iacMetadata.start_line;
        
                const startPosition = document.lineAt(startLine - 1).range.start;
                const endPosition = document.lineAt(startLine - 1).range.end;
    
                let severity: vscode.DiagnosticSeverity = vscode.DiagnosticSeverity.Warning;
                if (failedRule.enforcement_mode !== 'advise') {
                    severity = vscode.DiagnosticSeverity.Error;
                }
        
                foundDiagnostics.push({
                    message: this.toMessage(issueItem.evidence, failedRule.iac_remediation_steps),
                    range: new vscode.Range(startPosition, endPosition),
                    severity: severity,
                    source: 'Cloudrail ',
                    code: {value: 'Assessment Page', target: vscode.Uri.parse(runResults.assessmentLink)}
                });
                
                this.diagnostics.set(document.uri ,foundDiagnostics);
            }
        }
    }

    private toMessage(evidence: string, remediation: string): string {
        return `Issue:\n${parseEvidence(evidence, EvidenceFormat.plainText)}\n\nRemediation:\n${remediation}`;
    }
}