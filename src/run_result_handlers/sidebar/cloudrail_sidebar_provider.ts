import path from 'path';
import vscode from 'vscode';
import { CloudrailRunResponse } from '../../cloudrail_runner';
import { IssueItem, RuleResult } from '../../cloudrail_run_result_model';
import { RunResultsSubscriber } from '../run_result_subscriber';
import { EvidenceFormat, parseEvidence, parseHtmlLinks } from '../../tools/parse_utils';
import { CloudrailIssueInfoProvider } from './cloudrail_issue_info_provider';
import { CloudrailIssueItemTreeItem, NotificationTreeItem, CloudrailRuleTreeItem, CloudrailTreeItem } from './cloudrail_tree_item';

export default class CloudrailSidebarProvider implements vscode.TreeDataProvider<CloudrailTreeItem>, RunResultsSubscriber {
    private _onDidChangeTreeData: vscode.EventEmitter<CloudrailTreeItem | undefined | null | void> = new vscode.EventEmitter<CloudrailTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<CloudrailTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
    private readonly sidebarIssueInfoWebviewProvider: CloudrailIssueInfoProvider;
    private readonly extensionPath: string;
    private elements: CloudrailTreeItem[] = [];
    private _assessmentLink: string | undefined;
    private treeViewIconMap = new Map<TreeViewIcon, Icon>();

    constructor(context: vscode.ExtensionContext) {
        this.sidebarIssueInfoWebviewProvider = new CloudrailIssueInfoProvider();
        const sidebarIssueTree = vscode.window.createTreeView("cloudrail.issues", {
            treeDataProvider: this,
            canSelectMany: false
        });
        
        this.extensionPath = context.extensionPath;
        const sidebarIssueWebview = vscode.window.registerWebviewViewProvider("cloudrail.issue_info", this.sidebarIssueInfoWebviewProvider);
        context.subscriptions.push(sidebarIssueWebview);
    
        sidebarIssueTree.onDidChangeSelection( async (selectedElements) => {
            if (selectedElements.selection.length !== 1) {
                return;
            }
    
            const element = selectedElements.selection[0];
            this.sidebarIssueInfoWebviewProvider.showIssueInfo(element);
        });

        const imagesPath = path.join(this.extensionPath, 'images');
        this.treeViewIconMap.set(TreeViewIcon.none, {light: '', dark: ''});
        this.treeViewIconMap.set(TreeViewIcon.error, {light: path.join(imagesPath, 'run_error.svg'), dark: path.join(imagesPath, 'run_error.svg')});
        this.treeViewIconMap.set(TreeViewIcon.advise, {light: path.join(imagesPath, 'advise_mode_orange.svg'), dark: path.join(imagesPath, 'advise_mode_orange.svg')});
        this.treeViewIconMap.set(TreeViewIcon.mandate, {light: path.join(imagesPath, 'mandate_mode_red.svg'), dark: path.join(imagesPath, 'mandate_mode_red.svg')});
    }
    
    getTreeItem(element: CloudrailTreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: CloudrailTreeItem): vscode.ProviderResult<CloudrailTreeItem[]> {
        if (!element) {
            return this.elements;
        } else {
            if (element instanceof CloudrailRuleTreeItem) {
                return element.children;
            } else {
                return [];
            }
        }
    }

    resetView(message: string, icon: TreeViewIcon = TreeViewIcon.none) {
        const messageElement = new NotificationTreeItem(message);
        messageElement.iconPath = this.treeViewIconMap.get(icon);
        this.elements = [messageElement];
        this._assessmentLink = '';
        this.sidebarIssueInfoWebviewProvider.resetView();
        this._onDidChangeTreeData.fire();
    }

    async assessmentStart(): Promise<void> {
        this.resetView('Scanning, please wait...');
    }

    async assessmentFailed(): Promise<void> {
        this.resetView('Last scan failed', TreeViewIcon.error);
    }

    async updateRunResults(runResults: CloudrailRunResponse, ruleResults: RuleResult[], terraformWorkingDirectory: string): Promise<void> {
        this.elements = [];
        this._assessmentLink = runResults.assessmentLink;
        const failedRules = ruleResults.filter(ruleResult => ruleResult.status === 'failed');

        for (const failedRuleResult of failedRules) {
            const issueItemTreeItems = [];
            for (const issueItem of failedRuleResult.issue_items) {
                issueItemTreeItems.push(this.toIssueItemTreeItem(issueItem, terraformWorkingDirectory, failedRuleResult));
            }
            
            this.elements.push(this.toRuleTreeItem(failedRuleResult, issueItemTreeItems));
        }

        this._onDidChangeTreeData.fire();
    }

    private toIssueItemTreeItem(issueItem: IssueItem, basePath: string, ruleResult: RuleResult): CloudrailIssueItemTreeItem {
        const entity = issueItem.violating_entity;

        return new CloudrailIssueItemTreeItem(
            entity.iac_entity_id,
            entity.iac_resource_metadata.start_line,
            vscode.Uri.file(path.join(basePath, entity.iac_resource_metadata.file_name)),
            ruleResult.rule_name,
            parseEvidence(issueItem.evidence, EvidenceFormat.html),
            parseHtmlLinks(ruleResult.iac_remediation_steps),
            this._assessmentLink!,
        );
    }

    private toRuleTreeItem(ruleResult: RuleResult, children: CloudrailIssueItemTreeItem[]): CloudrailRuleTreeItem {
        const ruleTreeItem = new CloudrailRuleTreeItem(ruleResult.rule_name, ruleResult.severity, ruleResult.enforcement_mode, children);
        const base = path.join(this.extensionPath, 'images');
        if (ruleResult.enforcement_mode === 'advise') {
            ruleTreeItem.iconPath =  this.treeViewIconMap.get(TreeViewIcon.advise);
        } else {
            ruleTreeItem.iconPath =  this.treeViewIconMap.get(TreeViewIcon.mandate);
        }
        return ruleTreeItem;
    } 
}

export enum TreeViewIcon {
    none = 0,
    error = 1,
    mandate = 2, 
    advise = 3
}

type Icon = {
    light: string,
    dark: string
};