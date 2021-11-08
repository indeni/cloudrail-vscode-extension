import vscode from 'vscode';
import { Versioning } from '../tools/versioning';

export function cloudrailVersion(): void {    
    const versionMsg = `Cloudrail Version: ${Versioning.getCloudrailVersion()}` + '\n' + `Extension Version: ${Versioning.getExtensionVersion()}`;
    vscode.window.showInformationMessage(versionMsg, {modal:true});   
}
