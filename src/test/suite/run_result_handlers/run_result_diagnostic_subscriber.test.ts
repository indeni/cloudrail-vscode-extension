/* eslint-disable @typescript-eslint/naming-convention */
import vscode, { DiagnosticSeverity } from 'vscode';
import { match, restore, SinonStubbedInstance, stub } from 'sinon';
import { describe, beforeEach, it } from 'mocha';
import { assert } from 'chai';
import RunResultDiagnosticSubscriber from '../../../run_result_handlers/run_result_diagnostic_subscriber';
import { RuleResult } from '../../../cloudrail_run_result_model';
import path from 'path';

describe('RunResultDiagnosticSubscriber tests', () => {
    let diagnosticsStub: SinonStubbedInstance<vscode.DiagnosticCollection>;
    let diagnosticsSubscriber: RunResultDiagnosticSubscriber;
    
    beforeEach( () => {
        restore();
        let diagnostics = vscode.languages.createDiagnosticCollection('cloudrail');
        diagnosticsStub = stub(diagnostics);
        diagnosticsSubscriber = new RunResultDiagnosticSubscriber(diagnosticsStub);
    });

    it('assessmentStart', async () => {
        // Act
        await diagnosticsSubscriber.assessmentStart();

        // Assert
        assert.isTrue(diagnosticsStub.clear.calledOnce);
    });

    it('updateRunResults, no rule results', async () => {
        // Arrange
        let terraformWorkingDirectory = '';
        let runResults = {
            resultsFilePath: '',
            success: true,
            stdout: '',
            assessmentLink: 'link'
        };

        let ruleResults: RuleResult[] = [];

        // Act
        await diagnosticsSubscriber.updateRunResults(runResults, ruleResults, terraformWorkingDirectory);

        // Assert
        assert.isTrue(diagnosticsStub.set.notCalled);
    });

    it('updateRunResults, no failed rules', async () => {
        // Arrange
        let terraformWorkingDirectory = '';
        let runResults = {
            resultsFilePath: '',
            success: true,
            stdout: '',
            assessmentLink: 'link'
        };

        let ruleResults: RuleResult[] = [
            {
                rule_name: 'rule_name',
                status: 'passed',
                enforcement_mode: 'mandate',
                iac_remediation_steps: 'remediation',
                severity: 'low',
                issue_items: []
            }
        ];

        // Act
        await diagnosticsSubscriber.updateRunResults(runResults, ruleResults, terraformWorkingDirectory);

        // Assert
        assert.isTrue(diagnosticsStub.set.notCalled);
    });

    it('updateRunResults, with failed rule', async () => {
        // Arrange
        let terraformWorkingDirectory = '/home/tf';
        let runResults = {
            resultsFilePath: '',
            success: true,
            stdout: '',
            assessmentLink: 'http://assessment.link'
        };

        let ruleResults: RuleResult[] = [
            {
                rule_name: 'rule_name',
                status: 'failed',
                enforcement_mode: 'mandate',
                iac_remediation_steps: 'remediation',
                severity: 'low',
                issue_items: [
                    {
                        evidence: 'evidence',
                        exposed_entity: {
                            iac_resource_metadata: {
                                file_name: 'filename_exposed.tf',
                                start_line: 1,
                                end_line: 2,
                            },
                            iac_entity_id: 'exposed_entity_id'
                        },
                        violating_entity: {
                            iac_resource_metadata: {
                                file_name: 'filename_violating.tf',
                                start_line: 10,
                                end_line: 20,
                            },
                            iac_entity_id: 'violating_entity_id'
                        }
                    }
                ]
            }
        ];

        const openTextDocumentStub = stub(vscode.workspace, "openTextDocument");
        const issueFileUri = { 
            fsPath: path.join(terraformWorkingDirectory, "filename_violating.tf") 
        } as vscode.Uri;
        stubOpenTextDocument(openTextDocumentStub, issueFileUri);

        // Act
        await diagnosticsSubscriber.updateRunResults(runResults, ruleResults, terraformWorkingDirectory);

        // Assert
        // @ts-ignore
        assert.isTrue(diagnosticsStub.set.calledWith(issueFileUri, match( (value: vscode.Diagnostic[]) => {
            const diagnostic = value[0];
            let code = diagnostic.code! as {
                value: string,
                target: vscode.Uri
            };
            return diagnostic.message === 'Issue:\nevidence\n\nRemediation:\nremediation' &&
                    diagnostic.range.start.line === 9 &&
                    diagnostic.range.end.line === 9 &&
                    diagnostic.severity === DiagnosticSeverity.Error &&
                    diagnostic.source === 'Cloudrail' &&
                    code.value === 'Assessment Page' && 
                    code.target.toString() === vscode.Uri.parse('http://assessment.link').toString();
        })));
    });

    it('updateRunResults, with failed rule, and a passed rule', async () => {
        // Arrange
        let terraformWorkingDirectory = '/home/tf';
        let runResults = {
            resultsFilePath: '',
            success: true,
            stdout: '',
            assessmentLink: 'http://assessment.link'
        };

        let ruleResults: RuleResult[] = [
            {
                rule_name: 'failed_rule_name',
                status: 'failed',
                enforcement_mode: 'mandate',
                iac_remediation_steps: 'remediation',
                severity: 'low',
                issue_items: [
                    {
                        evidence: 'evidence',
                        exposed_entity: {
                            iac_resource_metadata: {
                                file_name: 'filename_exposed.tf',
                                start_line: 1,
                                end_line: 2,
                            },
                            iac_entity_id: 'exposed_entity_id'
                        },
                        violating_entity: {
                            iac_resource_metadata: {
                                file_name: 'filename_violating.tf',
                                start_line: 10,
                                end_line: 20,
                            },
                            iac_entity_id: 'violating_entity_id'
                        }
                    }
                ]
            },
            {
                rule_name: 'passed_rule_name',
                status: 'passed',
                enforcement_mode: 'mandate',
                iac_remediation_steps: 'remediation',
                severity: 'low',
                issue_items: []
            }
        ];

        const openTextDocumentStub = stub(vscode.workspace, "openTextDocument");
        const issueFileUri = { 
            fsPath: path.join(terraformWorkingDirectory, "filename_violating.tf") 
        } as vscode.Uri;
        stubOpenTextDocument(openTextDocumentStub, issueFileUri);

        // Act
        await diagnosticsSubscriber.updateRunResults(runResults, ruleResults, terraformWorkingDirectory);

        // Assert
        // @ts-ignore
        assert.isTrue(diagnosticsStub.set.calledWith(issueFileUri, match( (value: vscode.Diagnostic[]) => {
            const diagnostic = value[0];
            let code = diagnostic.code! as {
                value: string,
                target: vscode.Uri
            };
            return diagnostic.message === 'Issue:\nevidence\n\nRemediation:\nremediation' &&
                    diagnostic.range.start.line === 9 &&
                    diagnostic.range.end.line === 9 &&
                    diagnostic.severity === DiagnosticSeverity.Error &&
                    diagnostic.source === 'Cloudrail' &&
                    code.value === 'Assessment Page' && 
                    code.target.toString() === vscode.Uri.parse('http://assessment.link').toString();
        })));
        assert.isTrue(diagnosticsStub.set.calledOnce);
    });

    function stubOpenTextDocument(openTextDocumentStub: sinon.SinonStub, uri: vscode.Uri) {
        openTextDocumentStub
        // @ts-ignore
        .withArgs(uri.fsPath)
        .resolves({
            uri: uri,
            // @ts-ignore
            lineAt: (line: number) => {
                return { range: {
                    start: new vscode.Position(line, 0),
                    end: new vscode.Position(line , 10)
                }};
            }
        });
    }
});