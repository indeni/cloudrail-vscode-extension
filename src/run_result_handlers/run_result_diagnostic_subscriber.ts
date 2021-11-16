import vscode from 'vscode';
import path from 'path';
import { CloudrailRunResponse } from '../cloudrail_runner';
import { IssueItem, RuleResult } from '../cloudrail_run_result_model';
import { RunResultsSubscriber } from './run_result_subscriber';
import { EvidenceFormat, parseEvidence } from '../tools/parse_utils';

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
                const document = await this.getDocumentFromIssueItem(issueItem, terraformWorkingDirectory);
                const diagnostic = this.issueItemToDiagnostic(failedRule, issueItem, document, runResults.assessmentLink);

                const foundDiagnostics: vscode.Diagnostic[] = [];
                const existingDiagnostics: readonly vscode.Diagnostic[] | undefined = this.diagnostics.get(document.uri);
                Object.assign(foundDiagnostics, existingDiagnostics);

                foundDiagnostics.push(diagnostic);
                this.diagnostics.set(document.uri ,foundDiagnostics);
            }
        }
    }

    private issueItemToDiagnostic(failedRule: RuleResult, issueItem: IssueItem, document: vscode.TextDocument, assessmentLink: string): vscode.Diagnostic {
        const iacMetadata = issueItem.violating_entity.iac_resource_metadata;
        const startLine = iacMetadata.start_line;

        const startPosition = document.lineAt(startLine - 1).range.start;
        const endPosition = document.lineAt(startLine - 1).range.end;

        let severity: vscode.DiagnosticSeverity = vscode.DiagnosticSeverity.Warning;
        if (failedRule.enforcement_mode !== 'advise') {
            severity = vscode.DiagnosticSeverity.Error;
        }

        return {
            message: this.toMessage(issueItem.evidence, failedRule.iac_remediation_steps),
            range: new vscode.Range(startPosition, endPosition),
            severity: severity,
            source: 'Cloudrail ',
            code: {value: 'Assessment Page', target: vscode.Uri.parse(assessmentLink)}
        };
    }

    private async getDocumentFromIssueItem(issueItem: IssueItem, terraformWorkingDirectory: string): Promise<vscode.TextDocument> {
        const iacMetadata = issueItem.violating_entity.iac_resource_metadata;
        const docPath = path.join(terraformWorkingDirectory, iacMetadata.file_name);
        return await vscode.workspace.openTextDocument(docPath);
    }

    private toMessage(evidence: string, remediation: string): string {
        return `Issue:\n${parseEvidence(evidence, EvidenceFormat.plainText)}\n\nRemediation:\n${remediation}`;
    }
}