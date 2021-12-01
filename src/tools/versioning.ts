import vscode from 'vscode';

export class Versioning {
    private static cloudrailVersion: string;

    static setCloudrailVersion(cloudrailVersionOutput: string | undefined): string {
        if (cloudrailVersionOutput !== undefined) {
            Versioning.cloudrailVersion = cloudrailVersionOutput.split(/[\n\r\s]+/)[2];
        }

        return Versioning.cloudrailVersion;
    }

    static getCloudrailVersion(): string {
        if (Versioning.cloudrailVersion === undefined) {
            return `Not installed`;
        } else {
            return Versioning.cloudrailVersion;
        }
    }

    static getExtensionVersion(): string {
        return vscode.extensions.getExtension("Cloudrail.cloudrail-iac-scanning")?.packageJSON['version'];
    }
}