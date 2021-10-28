import * as vscode from 'vscode';
import { logger } from '../tools/logger';
import { resolveHomeDir } from './path_utils';
interface CloudrailConfiguration {
    apiKey?: string | undefined;
    terraformWorkingDirectory?: string | undefined;
    cloudrailPolicyId?: string | undefined;
    awsDefaultRegion?: string;
}

export function getConfig(): CloudrailConfiguration {
    const config = vscode.workspace.getConfiguration('cloudrail');

    return {
        apiKey: config.get('ApiKey'),
        terraformWorkingDirectory: resolveHomeDir(config.get('TerraformWorkingDirectory')),
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

    logger.debug(`Unset mandatory fields: ${unsetMandatoryFields.join(', ')}`);
    return unsetMandatoryFields;
}