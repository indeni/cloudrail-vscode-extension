import vscode from 'vscode';
import { CloudrailRunner, CloudrailRunResponse } from '../cloudrail_runner';
import { getUnsetMandatoryFields, getConfig, CloudrailConfiguration } from '../tools/configuration';
import { awaitInitialization, initializeEnvironment } from './init';
import { logger } from '../tools/logger';
import { getActiveTextEditorDirectoryInfo, resolvePath } from '../tools/path_utils';
import RunResultPublisher from '../run_result_handlers/run_result_publisher';
import { getVcsInfo } from '../tools/vcs_utils';


let scanInProgress = false;


export default async function scan(runResultPublisher: RunResultPublisher) {
    if (scanInProgress) {
        logger.debug('Scan in progress - exiting');
        vscode.window.showInformationMessage('Cannot run Cloudrail Scan while another scan is in progress.');
        return;
    }

    await runResultPublisher.assessmentStart();
    let isSuccessfulScan = false;

    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            cancellable: false
        }, async(progress) => {
            scanInProgress = true;
            progress.report({ increment: 0, message: 'Starting Cloudrail run'});

            let runResults: CloudrailRunResponse | undefined;
            const config = await getConfig();
            const terraformWorkingDirectory = await getTerraformWorkingDirectory(config);
            if (!terraformWorkingDirectory) {
                return;
            }
    
            const unsetMandatoryFields = await getUnsetMandatoryFields();
            if (unsetMandatoryFields.length > 0) {
                vscode.commands.executeCommand('workbench.action.openSettings', 'cloudrail');
                vscode.window.showErrorMessage(`The following required options are not set: ${unsetMandatoryFields.join(', ')}. Cloudrail cannot run without this information.`);
                return;
            }
            
            const vcsInfo = await getVcsInfo(terraformWorkingDirectory);
            const stdoutCallback = (data: string) => {
                progress.report({ increment: 10, message: data });
            };

            await awaitInitialization();
            runResults = await CloudrailRunner.cloudrailRun(terraformWorkingDirectory, config.apiKey, config.cloudrailPolicyId, config.awsDefaultRegion, vcsInfo, stdoutCallback);
            
            if (!runResults.success) {
                vscode.window.showErrorMessage('Cloudrail Run failed:\n' + runResults.stdout);
                return;
            }

            progress.report({ increment: 100, message: 'Applying scan results...'});
            runResultPublisher.updateRunResults(runResults, terraformWorkingDirectory);
            isSuccessfulScan = true;
        });
    } catch(e) {
        logger.exception(e, 'Failed to perform scan');
        try {
            if (!await CloudrailRunner.getCloudrailVersion()) {
                initializeEnvironment(false);
            } 
        } catch {
            initializeEnvironment(false);
        }
        
        vscode.window.showErrorMessage('An unknown error has occured while performing the scan. Please try again.');
    } finally {
        if (!isSuccessfulScan) {
            runResultPublisher.assessmentFailed();
        }
        scanInProgress = false;
    }
}

async function getTerraformWorkingDirectory(config: CloudrailConfiguration): Promise<string | undefined> {
    if (config.terraformWorkingDirectory) {
        const resolvedPath = resolvePath(config.terraformWorkingDirectory);
        if (!resolvedPath) {
            vscode.window.showErrorMessage('The directory specified in the TerraformWorkingDirectory settings could not be resolved. Either specify an absolute path or leave empty to scan on the active editor\'s directory.');    
            return;
        }
        return resolvedPath;
    }

    return await getTerraformWorkingDirectoryFromActiveEditor();
}

async function getTerraformWorkingDirectoryFromActiveEditor(): Promise<string | undefined> {
    const instruction = 'Open any file in the terraform module to be scanned, then run Cloudrail Scan';
    const activeTextEditorDirectoryInfo = await getActiveTextEditorDirectoryInfo();
    if (!activeTextEditorDirectoryInfo.path) {
        vscode.window.showErrorMessage(instruction);
        return;
    }

    if (!activeTextEditorDirectoryInfo.isInWorkspace) {
        const shouldScanPromptResult = await vscode.window.showInformationMessage('This file is outside of your workspace. Continue with a Cloudrail scan?', 'Scan', 'Cancel');
        if (shouldScanPromptResult !== 'Scan') {
            return;
        }
    }

    const files = activeTextEditorDirectoryInfo.dirContent?.filter( (value) => {
        return value.match(/.*.tf$/);
    });

    if (!files || files.length === 0) {
        vscode.window.showErrorMessage(`The current directory '${activeTextEditorDirectoryInfo.path}'' does not contain any terraform files. ${instruction}`);
        return;
    }

    return activeTextEditorDirectoryInfo.path;
}
