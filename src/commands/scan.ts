import vscode from 'vscode';
import simpleGit, { SimpleGitOptions } from 'simple-git';
import { CloudrailRunner, CloudrailRunResponse, VcsInfo } from '../cloudrail_runner';
import { getUnsetMandatoryFields, getConfig, CloudrailConfiguration } from '../tools/configuration';
import { awaitInitialization, initializeEnvironment } from './init';
import { logger, logPath } from '../tools/logger';
import { getActiveTextEditorDirectoryInfo, resolvePath } from '../tools/path_utils';
import RunResultPublisher from '../run_result_handlers/run_result_publisher';


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

            if (runResults === undefined) {
                vscode.window.showErrorMessage('Cloudrail failed to start');
                return;
            } else if (!runResults.success) {
                vscode.window.showErrorMessage('Cloudrail Run failed:\n' + runResults.stdout);
                return;
            }

            progress.report({ increment: 100, message: 'Applying scan results...'});
            runResultPublisher.updateRunResults(runResults, terraformWorkingDirectory);
            isSuccessfulScan = true;
        });
    } catch(e) {
        logger.error(`Failed to perform scan. reason: ${e}`);
        if (!await CloudrailRunner.getCloudrailVersion()) {
            vscode.window.showInformationMessage('Cloudrail is not installed, reinitializing and starting again...');
            if (await initializeEnvironment(true)) {
                scanInProgress = false;
                scan(runResultPublisher);
            }
        } else {
            vscode.window.showErrorMessage(`An unknown error has occured while performing the scan. Check log for more information: ${logPath}`);
        }
    } finally {
        if (!isSuccessfulScan) {
            runResultPublisher.assessmentFailed();
        }
        scanInProgress = false;
    }
}

async function getVcsInfo(baseDir: string): Promise<VcsInfo | undefined> {
    let vcsInfo: VcsInfo | undefined = undefined;
    const options: Partial<SimpleGitOptions> = {
		baseDir: baseDir,
		binary: 'git',
	 };
	 
     try {
        const git = simpleGit(options);
        if (await git.checkIsRepo()) {
            const branch = (await git.branch()).current;
            const commit = (await git.show()).replace('\n', ' ').split(' ')[1];
            const topLevel = await git.revparse(['--show-toplevel']);
            let repo = (await git.remote(['get-url', 'origin']) as string).replace('\n', '');
            let urlTemplate = baseDir.replace(topLevel + '/', '');
            repo = repo.replace('https://', '').replace('http://', '');
            repo = repo.slice(0, -4); // Remove .git suffix
            
            let buildLink;

            if (repo.includes('@')) {
                repo = repo
                        .replace(':', '/')
                        .slice(repo.indexOf('@') + 1); // Remove everything up to (and includes) '@'
            }
 
            if (repo.startsWith('bitbucket')) {
                buildLink = 'https://' + repo + '/src/';
                if (branch.includes('/')) { // For branches like bugfix/branchname or feature/branchname
                    buildLink += commit;
                } else {
                    buildLink += branch;
                }
                urlTemplate = buildLink + `/${urlTemplate}` + '/{iac_file_path}#lines-{iac_file_line_no}';
            } else if (repo.startsWith('github')) { 
                buildLink = 'https://' + repo + '/tree/' + branch;
                urlTemplate = buildLink + `/${urlTemplate}` + '/{iac_file_path}#L{iac_file_line_no}';
            } else {
                throw new Error('Unsupported vcs for repo: ' + repo);
            }

             vcsInfo = { repo: repo, branch: branch, commit: commit, buildLink: buildLink, urlTemplate: urlTemplate };
        }
     } catch(e) {
        logger.error('An error occured when trying to get vcs info: ' + e);
     }

     return vcsInfo;
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