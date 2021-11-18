import { CancellationToken, Webview, WebviewView, WebviewViewProvider, WebviewViewResolveContext } from "vscode";
import { toTitle } from "../../tools/parse_utils";
import { CloudrailIssueItemTreeItem, NotificationTreeItem, CloudrailRuleTreeItem, CloudrailTreeItem } from "./cloudrail_tree_item";


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

        const elementHtml = this.toHtml(element);
        if (elementHtml) {
            this.view.html = elementHtml;
        }
    }

    resetView(): void {
        if (this.view) {
            this.view.html = `No issue selected. Please run Cloudrail Scan and choose an issue`;
        }
    }

    private toHtml(element: CloudrailTreeItem): string | undefined{
        if (element instanceof CloudrailRuleTreeItem) {
            return `
            <h2>${element.ruleName}</h2>

            <h4>Severity: ${toTitle(element.severity)}</h4>
            
            <h4>Enforcement: ${toTitle(element.enforcementMode)}</h4>
            
            <h4>Number of issues: ${element.children.length}</h4>
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
        } else if (!(element instanceof NotificationTreeItem)) {
            throw new Error(`Not implemented for type ${typeof element}`);
        }
    }
    
}