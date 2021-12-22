import vscode from 'vscode';
import { restore } from 'sinon';
import { assert } from 'chai';
import { CloudrailIssueItemTreeItem, CloudrailRuleTreeItem, NotificationTreeItem } from '../../../run_result_handlers/sidebar/cloudrail_tree_item';

describe('CloudrailTreeItem tests', async () => {
    beforeEach( () => {
        restore();
    });

    it('CloudrailRuleTreeItem without children', () => {
        const ruleTreeItem = new CloudrailRuleTreeItem('ruleName', 'low', 'mandate');
        assert.isTrue(ruleTreeItem.children.length === 0);
        assert.equal(ruleTreeItem.collapsibleState, vscode.TreeItemCollapsibleState.None);
        assert.equal(ruleTreeItem.label, 'ruleName');
    });

    it('CloudrailIssueItemTreeItem', () => {
        const ruleTreeItem = new CloudrailRuleTreeItem('ruleName', 'low', 'mandate');
        const issueItemUri = {} as vscode.Uri;
        const issueItemLineNumber = 5;
        const issueItemLinePosition = new vscode.Position(issueItemLineNumber - 1, 0);
        const issueItemTreeItem = new CloudrailIssueItemTreeItem('resourceName', issueItemLineNumber, issueItemUri, 'ruleName', 'evidence', 'remediation', 'https://assessment.link', ruleTreeItem);
        
        assert.equal(issueItemTreeItem.resourceUri, issueItemUri);
        assert.equal(issueItemTreeItem.parent, ruleTreeItem);
        assert.equal(issueItemTreeItem.command?.command, 'vscode.open');
        assert.equal(issueItemTreeItem.collapsibleState, vscode.TreeItemCollapsibleState.None);
        const commandArgs: any[] = issueItemTreeItem.command!.arguments!;
        assert.isTrue(commandArgs.some( (x) => x === issueItemUri));
        assert.isTrue(commandArgs.some( (x) => x.selection !== undefined && x.preserveFocus !== undefined &&  x.selection.isEqual(new vscode.Range(issueItemLinePosition, issueItemLinePosition)) && x.preserveFocus));

        assert.isTrue(ruleTreeItem.children.length === 0);
        ruleTreeItem.setChildren([issueItemTreeItem]);
        assert.isTrue(ruleTreeItem.children.length === 1);
        assert.isTrue(ruleTreeItem.children[0] === issueItemTreeItem);
        assert.equal(ruleTreeItem.collapsibleState, vscode.TreeItemCollapsibleState.Collapsed);
    });

    it('NotificationTreeItem', () => {
        const notificationTreeItem = new NotificationTreeItem('message');
        assert.equal(notificationTreeItem.collapsibleState, vscode.TreeItemCollapsibleState.None);
        assert.equal(notificationTreeItem.label, 'message');
    });
});