/* eslint-disable @typescript-eslint/naming-convention */
import vscode, { TreeItem } from 'vscode';
import { restore } from 'sinon';
import { describe, beforeEach, it } from 'mocha';
import { assert } from 'chai';
import CloudrailSidebarProvider, { TreeViewIcon } from '../../../run_result_handlers/sidebar/cloudrail_sidebar_provider';
import { CloudrailRunResponse } from '../../../cloudrail_runner';
import { IssueItem, RuleResult } from '../../../cloudrail_run_result_model';
import { CloudrailRuleTreeItem, CloudrailTreeItem, NotificationTreeItem } from '../../../run_result_handlers/sidebar/cloudrail_tree_item';

describe('CloudrailSidebarProvider tests', async () => {

    const sidebarProvider: CloudrailSidebarProvider = (await vscode.commands.executeCommand('cloudrail.tests.getSidebarProvider'))!;
    const ruleResults: RuleResult[] = [
        {
            rule_name: 'failed_rule_name',
            status: 'failed',
            enforcement_mode: 'mandate',
            iac_remediation_steps: 'remediation',
            severity: 'low',
            issue_items: generateIssueItems()
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

    beforeEach( () => {
        restore();
    });

    it('TreeView show passed rules toggle', async () => {
        // Start with no children at all
        let elements = getSidebarRuleTreeItems();
        assert.deepEqual(elements, []);

        // Adding a failed and passed rule tree items
        sidebarProvider.updateRunResults({assessmentLink: 'assessmentLink'} as CloudrailRunResponse, ruleResults, '/workingDir');
        // When passed rules are visible
        sidebarProvider.setShowPassedRulesMode(true);
        elements = getSidebarRuleTreeItems();
        assert.equal(elements.length, 2);
        assert.isTrue(elements.some( (value) => { return (value as CloudrailRuleTreeItem).children.length === 0} )); // Passed rule
        assert.isTrue(elements.some( (value) => { return (value as CloudrailRuleTreeItem).children.length === 1} )); // Failed rule

        // When passed rules are hidden
        sidebarProvider.setShowPassedRulesMode(false);
        elements = getSidebarRuleTreeItems();
        assert.equal(elements.length, 1);
        assert.isTrue((elements[0] as CloudrailRuleTreeItem).children.length === 1); // Failed rule
    });

    it('resetView', () => {
        // Arrange
        const message = 'some random message';

        // Act
        sidebarProvider.resetView(message);

        // Assert
        assertResetView(message);
    });

    it('assessmentStart', async () => {
        await sidebarProvider.assessmentStart();
        assertResetView('Scanning, please wait...')
    });

    it('assessmentFailed', async () => {
        await sidebarProvider.assessmentFailed();
        assertResetView('Last scan failed', TreeViewIcon.error)
    });

    it('updateRunResults - sorted by failed > enforcement > severity', () => {
        sidebarProvider.setShowPassedRulesMode(true);
        const issueItems2 = generateIssueItems();
        const issueItems4 = generateIssueItems();
        issueItems4.push(...generateIssueItems());
        // rule_{STATUS}_{ENFORCEMENT}_{SEVERITY}_{NUMBER OF ISSUE ITEMS}
        const rule_failed_mandate_low_2: RuleResult = {
            rule_name: 'rule_failed_mandate_low_2',
            status: 'failed',
            enforcement_mode: 'mandate',
            iac_remediation_steps: 'remediation',
            severity: 'low',
            issue_items: issueItems2
        };

        const rule_failed_advise_low_2: RuleResult = {
            rule_name: 'rule_failed_advise_low_2',
            status: 'failed',
            enforcement_mode: 'advise',
            iac_remediation_steps: 'remediation',
            severity: 'low',
            issue_items: issueItems2
        };

        const rule_failed_advise_medium_2: RuleResult = {
            rule_name: 'rule_failed_advise_medium_2',
            status: 'failed',
            enforcement_mode: 'advise',
            iac_remediation_steps: 'remediation',
            severity: 'medium',
            issue_items: issueItems2
        };

        const rule_failed_advise_major_2: RuleResult = {
            rule_name: 'rule_failed_advise_major_2',
            status: 'failed',
            enforcement_mode: 'advise',
            iac_remediation_steps: 'remediation',
            severity: 'major',
            issue_items: issueItems2
        };

        const rule_passed_mandate_low: RuleResult = {
            rule_name: 'rule_passed_mandate_low',
            status: 'failed',
            enforcement_mode: 'mandate',
            iac_remediation_steps: 'remediation',
            severity: 'low',
            issue_items: []
        };

        // Assert sort by status
        assertOrder(rule_failed_mandate_low_2, rule_passed_mandate_low);
        // Assert sort by enforcement
        assertOrder(rule_failed_mandate_low_2, rule_failed_advise_low_2);
        // Assert sort by severity major vs medium
        assertOrder(rule_failed_advise_major_2, rule_failed_advise_medium_2);
        // Assert sort by severity major vs low
        assertOrder(rule_failed_advise_major_2, rule_failed_advise_low_2);
        // Assert sort by severity medium vs low
        assertOrder(rule_failed_advise_medium_2, rule_failed_advise_low_2);
    });

    function assertOrder(topRule: RuleResult, bottomRule: RuleResult): void {
        [ [topRule, bottomRule], [bottomRule, topRule] ].forEach( (rules) => {
            sidebarProvider.updateRunResults({assessmentLink: 'assessmentLink'} as CloudrailRunResponse, rules, '/workingDir');
            const children = getSidebarRuleTreeItems();
            assert.equal(children.length, 2);
            assert.equal(children[0].ruleName, topRule.rule_name)
        });
    }

    function assertResetView(message: string, icon: TreeViewIcon = TreeViewIcon.none): void {
        
        const treeItems = sidebarProvider.getChildren() as Array<TreeItem>;
        assert.isTrue((treeItems.length === 1 && 
                      (treeItems[0] as NotificationTreeItem).message === message) &&
                      treeItems[0].iconPath === sidebarProvider.resolveIcon(icon));
    }

    function getSidebarRuleTreeItems(element?: CloudrailTreeItem): CloudrailRuleTreeItem[] {
        return sidebarProvider.getChildren(element) as CloudrailRuleTreeItem[];
    }

    function generateIssueItems(): IssueItem[] {
        return [
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
});