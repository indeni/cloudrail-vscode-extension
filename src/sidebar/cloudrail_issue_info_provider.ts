import { CancellationToken, Webview, WebviewView, WebviewViewProvider, WebviewViewResolveContext } from "vscode";
import { CloudrailIssueItemTreeItem, CloudrailRuleTreeItem, CloudrailTreeItem } from "./cloudrail_tree_item";


export class CloudrailIssueInfoProvider implements WebviewViewProvider {
    private view: Webview | undefined;

    resolveWebviewView(webviewView: WebviewView, context: WebviewViewResolveContext<unknown>, token: CancellationToken): void | Thenable<void> {
        this.view = webviewView.webview;
        this.resetView();
    }

    showIssueInfo(element: CloudrailTreeItem): void {
        if (!this.view) {
            return;
        }

        this.view.html = this.toHtml(element);
    }

    resetView(): void {
        if (this.view) {
            this.view.html = `No issue selected. Please run Cloudrail Scan and choose an issue`;
        }
    }

    private toHtml(element: CloudrailTreeItem): string {
        if (element instanceof CloudrailRuleTreeItem) {
            return `
            <h2>${element.ruleName}</h2>

            <h3>Severity: ${element.severity}</h3>

            Enforcement: ${element.enforcementMode}

            Number of issues: ${element.children.length}
            `;
        } else if (element instanceof CloudrailIssueItemTreeItem) {
            return `
            <h2>${element.ruleName}</h2>
            ${element.evidence}
    
            <h3>Remediation</h3>
            ${element.remediation}
    
            <h3>Assessment Link</h3>
            <a href="${element.assessmentLink}">Jump to the assessment page
            `;
        } else {
            throw new Error(`Not implemented for type ${typeof element}`);
        }
    }
    
}