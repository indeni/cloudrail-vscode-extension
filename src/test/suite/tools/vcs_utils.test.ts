import { restore } from 'sinon';
import { assert } from 'chai';
import { generateVcsInfo } from '../../../tools/vcs_utils';
import { URL } from 'url';

describe('vcs_utils tests', () => {
    beforeEach( () => {
        restore();
    });

    it('generateVcsInfo, github repo, main branch, simple relative path', () => {
        // Arrange
        const repoLink = 'https://github.com/indeni/somerepo.git';
        const repoName = 'github.com/indeni/somerepo';
        const branch = 'main';
        const commit = 'c220938a005d279e028dh9ebad145268e4112199';
        const relativePath = 'folder';

        // Act
        const actual = generateVcsInfo(repoLink, branch, commit, relativePath);

        // Assert
        assert.deepEqual(actual, {
            repo: repoName,
            branch: branch,
            commit: commit,
            buildLink: `https://github.com/indeni/somerepo/tree/main`,
            urlTemplate: 'https://github.com/indeni/somerepo/tree/main/folder/{iac_file_path}#L{iac_file_line_no}'
        });
    });

    it('generateVcsInfo, github repo, bug branch, simple relative path', () => {
        // Arrange
        const repoLink = 'https://github.com/indeni/somerepo.git';
        const repoName = 'github.com/indeni/somerepo';
        const branch = 'bugfix/Issue-123';
        const commit = 'c220938a005d279e028dh9ebad145268e4112199';
        const relativePath = 'folder';

        // Act
        const actual = generateVcsInfo(repoLink, branch, commit, relativePath);

        // Assert
        assert.deepEqual(actual, {
            repo: repoName,
            branch: branch,
            commit: commit,
            buildLink: `https://github.com/indeni/somerepo/tree/bugfix/Issue-123`,
            urlTemplate: 'https://github.com/indeni/somerepo/tree/bugfix/Issue-123/folder/{iac_file_path}#L{iac_file_line_no}'
        });
    });

    it('generateVcsInfo, bitbucket repo, main branch, simple relative path', () => {
        // Arrange
        const repoLink = 'git@bitbucket.org:indeni/somerepo.git';
        const repoName = 'bitbucket.org/indeni/somerepo';
        const branch = 'main';
        const commit = 'c220938a005d279e028dh9ebad145268e4112199';
        const relativePath = 'folder';

        // Act
        const actual = generateVcsInfo(repoLink, branch, commit, relativePath);

        // Assert
        assert.deepEqual(actual, {
            repo: repoName,
            branch: branch,
            commit: commit,
            buildLink: `https://bitbucket.org/indeni/somerepo/src/main`,
            urlTemplate: 'https://bitbucket.org/indeni/somerepo/src/main/folder/{iac_file_path}#lines-{iac_file_line_no}'
        });
    });

    it('generateVcsInfo, bitbucket repo, bug branch, simple relative path', () => {
        // Arrange
        const repoLink = 'git@bitbucket.org:indeni/somerepo.git';
        const repoName = 'bitbucket.org/indeni/somerepo';
        const branch = 'main';
        const commit = 'c220938a005d279e028dh9ebad145268e4112199';
        const relativePath = 'folder';

        // Act
        const actual = generateVcsInfo(repoLink, branch, commit, relativePath);

        // Assert
        assert.deepEqual(actual, {
            repo: repoName,
            branch: branch,
            commit: commit,
            buildLink: 'https://bitbucket.org/indeni/somerepo/src/main',
            urlTemplate: 'https://bitbucket.org/indeni/somerepo/src/main/folder/{iac_file_path}#lines-{iac_file_line_no}'
        });
    });

    it('generateVcsInfo, nested relative path with spaces - test valid urls', () => {
        // Arrange
        const repoLink = 'git@bitbucket.org:indeni/somerepo.git';
        const repoName = 'bitbucket.org/indeni/somerepo';
        const branch = 'main';
        const commit = 'c220938a005d279e028dh9ebad145268e4112199';
        const relativePath = 'aaa/bbb/ccc ddd';

        // Act
        const actual = generateVcsInfo(repoLink, branch, commit, relativePath);

        // Assert
        assert.equal(actual.urlTemplate, 'https://bitbucket.org/indeni/somerepo/src/main/aaa%2Fbbb%2Fccc%20ddd/{iac_file_path}#lines-{iac_file_line_no}');
        assert.isTrue(isValidHttpUrl(actual.urlTemplate));
    });

    function isValidHttpUrl(str: string): boolean {
        let url;
        
        try {
          url = new URL(str);
        } catch (_) {
          return false;  
        }
      
        return url.protocol === "http:" || url.protocol === "https:";
    }
});