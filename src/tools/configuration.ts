import * as vscode from 'vscode';
import { logger } from '../tools/logger';
import { resolveHomeDir } from './path_utils';
import { CloudrailRunner } from '../cloudrail_runner';


interface CloudrailConfiguration {
    apiKey: string;
    terraformWorkingDirectory: string;
    cloudrailPolicyId: string;
    awsDefaultRegion: string;
}

export async function getConfig(): Promise<CloudrailConfiguration> {
    const config = vscode.workspace.getConfiguration('cloudrail');

    return {
        apiKey: await getApiKey(config),
        terraformWorkingDirectory: resolveHomeDir(config.get('TerraformWorkingDirectory'))!,
        cloudrailPolicyId: config.get('CloudrailPolicyId')!,
        awsDefaultRegion: config.get('AwsDefaultRegion')!
    };
}


export async function getUnsetMandatoryFields(): Promise<string[]> {
    let unsetMandatoryFields = [];
    const config = await getConfig();

    if (!config.apiKey) {
        unsetMandatoryFields.push('ApiKey');
    }

    if (!config.terraformWorkingDirectory) {
        unsetMandatoryFields.push('TerraformWorkingDirectory');
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