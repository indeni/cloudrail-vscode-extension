import path from 'path';
import vscode from 'vscode';
import { CloudrailRunResponse } from '../../cloudrail_runner';
import { IssueItem, RuleResult } from '../../cloudrail_run_result_model';
import { RunResultsSubscriber } from '../run_result_subscriber';
import { EvidenceFormat, parseEvidence, parseHtmlLinks } from '../../tools/parse_utils';
import { CloudrailIssueInfoProvider } from './cloudrail_issue_info_provider';
import { CloudrailIssueItemTreeItem, NotificationTreeItem, CloudrailRuleTreeItem, CloudrailTreeItem } from './cloudrail_tree_item';


export default class CloudrailSidebarProvider implements vscode.TreeDataProvider<CloudrailTreeItem>, RunResultsSubscriber {
    public static readonly showPassedRuleId = 'cloudrail.show_passed_rules';
    private _onDidChangeTreeData: vscode.EventEmitter<CloudrailTreeItem | undefined | null | void> = new vscode.EventEmitter<CloudrailTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<CloudrailTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
    private readonly sidebarIssueInfoWebviewProvider: CloudrailIssueInfoProvider;
    private readonly extensionPath: string;
    private readonly webView: vscode.Disposable;
    private elements: CloudrailTreeItem[] = [];
    private visibleElements: CloudrailTreeItem[] = [];
    private assessmentLink: string | undefined;
    private treeViewIconMap = new Map<TreeViewIcon, Icon>();
    private showPassedRules: boolean = true;

    constructor(private context: vscode.ExtensionContext) {
        this.createTreeView();
        this.sidebarIssueInfoWebviewProvider = new CloudrailIssueInfoProvider();
        this.webView = this.createWebView(context);
        this.extensionPath = context.extensionPath;

        const imagesPath = path.join(this.extensionPath, 'images');
        this.treeViewIconMap.set(TreeViewIcon.none, {light: '', dark: ''});
        this.treeViewIconMap.set(TreeViewIcon.error, {light: path.join(imagesPath, 'run_error.svg'), dark: path.join(imagesPath, 'run_error.svg')});
        this.treeViewIconMap.set(TreeViewIcon.advise, {light: path.join(imagesPath, 'advise_mode_orange.svg'), dark: path.join(imagesPath, 'advise_mode_orange.svg')});
        this.treeViewIconMap.set(TreeViewIcon.mandate, {light: path.join(imagesPath, 'mandate_mode_red.svg'), dark: path.join(imagesPath, 'mandate_mode_red.svg')});
        this.treeViewIconMap.set(TreeViewIcon.passed, {light: path.join(imagesPath, 'rule_passed.svg'), dark: path.join(imagesPath, 'rule_passed.svg')});

        this.setShowPassedRulesMode(this.context.workspaceState.get(CloudrailSidebarProvider.showPassedRuleId, true));
    }
    
    getTreeItem(element: CloudrailTreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: CloudrailTreeItem): vscode.ProviderResult<CloudrailTreeItem[]> {
        if (!element) {
            return this.visibleElements;
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
        messageElement.iconPath = this.resolveIcon(icon);
        this.elements = this.visibleElements = [messageElement];
        this.assessmentLink = '';
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
        this.assessmentLink = runResults.assessmentLink;

        for (const failedRuleResult of ruleResults) {
            const issueItemTreeItems = [];
            for (const issueItem of failedRuleResult.issue_items) {
                issueItemTreeItems.push(this.toIssueItemTreeItem(issueItem, terraformWorkingDirectory, failedRuleResult));
            }
            
            this.elements.push(this.toRuleTreeItem(failedRuleResult, issueItemTreeItems));
        }

        this.elements.sort((item1, item2) => {
            return this.getPriorityScore(item2 as CloudrailRuleTreeItem) - this.getPriorityScore(item1 as CloudrailRuleTreeItem);
        });

        this.refresh();
    }

    setShowPassedRulesMode(showPassedRules: boolean): void {
        vscode.commands.executeCommand('setContext', CloudrailSidebarProvider.showPassedRuleId, showPassedRules);
        this.context.workspaceState.update(CloudrailSidebarProvider.showPassedRuleId, showPassedRules);
        this.showPassedRules = showPassedRules;
        this.refresh();
    }

    resolveIcon(icon: TreeViewIcon): Icon | undefined {
        return this.treeViewIconMap.get(icon);
    }

    private refresh(): void {
        if (this.elements.length > 0 && this.elements[0] instanceof NotificationTreeItem) {
            return;
        }
        if (this.showPassedRules) {
            this.visibleElements = this.elements;
        } else {
            this.visibleElements = this.elements.filter((x) => {
                return (x instanceof CloudrailRuleTreeItem && x.children.length > 0);
            });
        }
        
        this._onDidChangeTreeData.fire();
    }

    private getPriorityScore(ruleTreeItem: CloudrailRuleTreeItem): number {
        let score = 0;
        score |= ruleTreeItem.children && ruleTreeItem.children.length > 0 ? 8 : 0;
        score |= ruleTreeItem.enforcementMode.toLowerCase().startsWith('mandate') ? 4 : 0;
        if (ruleTreeItem.severity.toLowerCase() === 'major') {
            score |= 2;
        } else if (ruleTreeItem.severity.toLowerCase() === 'medium') {
            score |= 1;
        }

        return score;
    }

    private toIssueItemTreeItem(issueItem: IssueItem, basePath: string, ruleResult: RuleResult): CloudrailIssueItemTreeItem {
        const entity = issueItem.violating_entity.iac_resource_metadata ? issueItem.violating_entity : issueItem.exposed_entity;

        return new CloudrailIssueItemTreeItem(
            entity.iac_entity_id,
            entity.iac_resource_metadata.start_line,
            vscode.Uri.file(path.join(basePath, entity.iac_resource_metadata.file_name)),
            ruleResult.rule_name,
            parseEvidence(issueItem.evidence, EvidenceFormat.html),
            parseHtmlLinks(ruleResult.iac_remediation_steps),
            this.assessmentLink!,
        );
    }

    private toRuleTreeItem(ruleResult: RuleResult, children: CloudrailIssueItemTreeItem[]): CloudrailRuleTreeItem {
        const ruleTreeItem = new CloudrailRuleTreeItem(ruleResult.rule_name, ruleResult.severity, ruleResult.enforcement_mode, children);

        if (ruleResult.issue_items.length === 0) {
            ruleTreeItem.iconPath = this.resolveIcon(TreeViewIcon.passed);
        }
        else if (ruleResult.enforcement_mode === 'advise') {
            ruleTreeItem.iconPath =  this.resolveIcon(TreeViewIcon.advise);
        } else {
            ruleTreeItem.iconPath =  this.resolveIcon(TreeViewIcon.mandate);
        }
        return ruleTreeItem;
    }

    private createTreeView() {
        const treeView = vscode.window.createTreeView("cloudrail.issues", {
            treeDataProvider: this,
            canSelectMany: false
        });
        treeView.onDidChangeSelection( async (selectedElements) => {
            if (selectedElements.selection.length !== 1) {
                return;
            }
    
            const element = selectedElements.selection[0];
            this.sidebarIssueInfoWebviewProvider.showIssueInfo(element);
        });

        return treeView;
    }

    private createWebView(context: vscode.ExtensionContext) {
        if (this.webView) {
            this.webView.dispose();
        }

        const webView = vscode.window.registerWebviewViewProvider("cloudrail.issue_info", this.sidebarIssueInfoWebviewProvider);
        context.subscriptions.push(webView);

        return webView;
    }
}

export enum TreeViewIcon {
    none = 0,
    error = 1,
    mandate = 2, 
    advise = 3,
    passed = 4
}

type Icon = {
    light: string,
    dark: string
};