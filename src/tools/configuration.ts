import * as vscode from 'vscode';


interface CloudrailConfiguration {
    apiKey?: string | undefined;
    terraformWorkingDirectory?: string | undefined;
    cloudAccountId?: string | undefined;
    cloudrailPolicyId?: string | undefined;
    awsDefaultRegion?: string;
}

export function getConfig(): CloudrailConfiguration {
    const config = vscode.workspace.getConfiguration('cloudrail');

    return {
        apiKey: config.get('ApiKey'),
        terraformWorkingDirectory: config.get('TerraformWorkingDirectory'),
        cloudAccountId: config.get('CloudAccountId'),
        cloudrailPolicyId: config.get('CloudrailPolicyId'),
        awsDefaultRegion: config.get('AwsDefaultRegion')
    };
}


export function getUnsetMandatoryFields(): string[] {
    let unsetMandatoryFields = [];
    const config = getConfig();

    if (!config.apiKey) {
        unsetMandatoryFields.push('ApiKey');
    }

    if (!config.terraformWorkingDirectory) {
        unsetMandatoryFields.push('TerraformWorkingDirectory');
    }

    return unsetMandatoryFields;
}