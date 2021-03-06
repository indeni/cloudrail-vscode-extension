import vscode from 'vscode';
import { logger } from '../tools/logger';
import { CloudrailRunner } from '../cloudrail_runner';


export interface CloudrailConfiguration {
    apiKey: string;
    cloudrailPolicyId: string;
    awsDefaultRegion: string;
    terraformWorkingDirectory: string;
}

export async function getConfig(): Promise<CloudrailConfiguration> {
    const config = vscode.workspace.getConfiguration('cloudrail');
    return {
        apiKey: await getApiKey(config),
        cloudrailPolicyId: config.get('CloudrailPolicyId')!,
        awsDefaultRegion: config.get('AwsDefaultRegion')!,
        terraformWorkingDirectory: config.get('TerraformWorkingDirectory')!
    };
}


export async function getUnsetMandatoryFields(): Promise<string[]> {
    let unsetMandatoryFields = [];
    const config = await getConfig();

    if (!config.apiKey) {
        unsetMandatoryFields.push('ApiKey');
    }

    logger.debug(`Unset mandatory fields: ${unsetMandatoryFields.join(', ')}`);
    return unsetMandatoryFields;
}

async function getApiKey(config: vscode.WorkspaceConfiguration): Promise<string> {
    let apiKey: string = config.get('ApiKey')!;
    if (!apiKey) {
        apiKey = await CloudrailRunner.getApiKey();
    }

    return apiKey;
}