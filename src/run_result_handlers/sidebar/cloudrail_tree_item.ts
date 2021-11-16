import vscode from 'vscode';


export class CloudrailTreeItem extends vscode.TreeItem {}

export class CloudrailRuleTreeItem extends CloudrailTreeItem {
    public children: CloudrailIssueItemTreeItem[] = [];

    constructor(public ruleName: string,
                public severity: string,
                public enforcementMode: string,
                children?: CloudrailIssueItemTreeItem[]) {
        super(ruleName, vscode.TreeItemCollapsibleState.None);
        this.setChildren(children);
    }

    setChildren(children?: CloudrailIssueItemTreeItem[]) {
        if (children) {
            this.children = children;
        }
        
        this.description = this.children.length.toString();
        this.collapsibleState = this.getCollapsibleState(children);
    }

    private getCollapsibleState(children?: CloudrailIssueItemTreeItem[]): vscode.TreeItemCollapsibleState {
        return children && children.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;
    }
}

export class CloudrailIssueItemTreeItem extends CloudrailTreeItem {
    public parent: CloudrailRuleTreeItem | undefined;

    constructor(resourceName: string,
                public line: number,
                public resourceUri: vscode.Uri,
                public ruleName: string,
                public evidence: string,
                public remediation: string,
                public assessmentLink: string,
                parent?: CloudrailRuleTreeItem) {
        super(resourceName, vscode.TreeItemCollapsibleState.None);
        this.resourceUri = resourceUri;
        this.parent = parent;
        this.setOpenDocumentOnClick();
    }

    private setOpenDocumentOnClick() {
        const linePosition = new vscode.Position(this.line-1, 0);
        this.command = {
            title: "",
            command: "vscode.open",
            arguments: [
                this.resourceUri,
                <vscode.TextDocumentShowOptions>{
					selection: new vscode.Range(linePosition, linePosition),
					preserveFocus: true
				}
            ]
        };
    }
}

export class NotificationTreeItem extends CloudrailTreeItem {
    constructor(public message: string) {
        super(message, vscode.TreeItemCollapsibleState.None);
    }
}