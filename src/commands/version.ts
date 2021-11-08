import vscode from 'vscode';
import { Versioning } from '../tools/versioning';

export function cloudrailVersion(): void {    
    const versionMsg = `Cloudrail Version: ${Versioning.getCloudrailVersion()}\nExtension Version: ${Versioning.getExtensionVersion()}`;
    vscode.window.showInformationMessage(versionMsg, {modal:true});   
}
