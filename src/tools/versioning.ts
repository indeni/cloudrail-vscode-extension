import vscode from 'vscode';

export class Versioning {
    private static cloudrailVersion: string;

    static setCloudrailVersion(cloudrailVersionOutput: string | undefined): string {
        if (cloudrailVersionOutput !== undefined) {
            this.cloudrailVersion = cloudrailVersionOutput.split(/[\n\r\s]+/)[2];
        }

        return this.cloudrailVersion;
    }

    static getCloudrailVersion(): string {
        if (this.cloudrailVersion === undefined) {
            this.resetCloudrailVersion();
        }

        return this.cloudrailVersion;
    }

    static getExtensionVersion(): string {
        return vscode.extensions.getExtension("Cloudrail.cloudrail-iac-scanning")?.packageJSON['version'];
    }

    static resetCloudrailVersion(): void {
        this.cloudrailVersion = 'Not installed';
    }
}