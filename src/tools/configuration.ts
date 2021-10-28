import { homedir } from 'os';
import path from 'path';
import * as vscode from 'vscode';
import { logger } from '../tools/logger';
import { resolveHomeDir } from './path_utils';
import * as yaml from 'js-yaml';
import { existsSync, readFileSync } from 'fs';


interface CloudrailConfiguration {
    apiKey: string;
    terraformWorkingDirectory: string;
    cloudrailPolicyId: string;
    awsDefaultRegion: string;
}

export function getConfig(): CloudrailConfiguration {
    const config = vscode.workspace.getConfiguration('cloudrail');

    return {
        apiKey: getApiKey(config),
        terraformWorkingDirectory: resolveHomeDir(config.get('TerraformWorkingDirectory'))!,
        cloudrailPolicyId: config.get('CloudrailPolicyId')!,
        awsDefaultRegion: config.get('AwsDefaultRegion')!
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

function getApiKey(config: vscode.WorkspaceConfiguration): string {
    let apiKey: string = config.get('ApiKey')!;
    if (!apiKey) {
        const cloudrailConfigPath = path.join(homedir(), '.cloudrail', 'config');
        if (existsSync(cloudrailConfigPath)) {
            try {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                const cloudrailConfig = yaml.load(readFileSync(cloudrailConfigPath, 'utf-8')) as {api_key: string};
                apiKey = cloudrailConfig.api_key;
            } catch(e) {
                logger.error(`Error when trying to read cloudrail config: ${e}`);
            }
        }
    }

    return apiKey;
}