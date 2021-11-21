import simpleGit, { SimpleGitOptions } from "simple-git";
import { VcsInfo } from "../cloudrail_runner";
import { logger } from "./logger";


export async function getVcsInfo(baseDir: string): Promise<VcsInfo | undefined> {
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
            let relativePath = baseDir.replace(topLevel + '/', '');
            
            return generateVcsInfo(repo, branch, commit, relativePath);
        }
     } catch(e) {
        logger.error('An error occured when trying to get vcs info: ' + e);
     }

     return vcsInfo;
}

export function generateVcsInfo(repository: string, branch: string, commit: string, relativePath: string): VcsInfo {
    let urlTemplate: string | undefined;
    repository = repository.replace('https://', '').replace('http://', '');
    repository = repository.slice(0, -4); // Remove .git suffix
    relativePath = encodeURIComponent(relativePath);
    
    let buildLink;

    if (repository.includes('@')) {
        repository = repository
                .replace(':', '/')
                .slice(repository.indexOf('@') + 1); // Remove everything up to (and includes) '@'
    }

    if (repository.startsWith('bitbucket')) {
        buildLink = 'https://' + repository + '/src/';
        if (branch.includes('/')) { // For branches like bugfix/branchname or feature/branchname
            buildLink += commit;
        } else {
            buildLink += branch;
        }
        urlTemplate = buildLink + `/${relativePath}` + '/{iac_file_path}#lines-{iac_file_line_no}';
    } else if (repository.startsWith('github')) { 
        buildLink = 'https://' + repository + '/tree/' + branch;
        urlTemplate = buildLink + `/${relativePath}` + '/{iac_file_path}#L{iac_file_line_no}';
    } else {
        throw new Error('Unsupported vcs for repo: ' + repository);
    }

     return { repo: repository, branch: branch, commit: commit, buildLink: buildLink, urlTemplate: urlTemplate };
}