import { restore } from 'sinon';
import { assert } from 'chai';
import { describe, beforeEach, it, afterEach } from 'mocha';
import { Versioning } from '../../../tools/versioning';

describe('Versioning unit tests', () => {

    beforeEach(() => {
        restore();
    });

    it('getCloudrailVersion when version is not set', async () => {
        // Arrange / Act
        const version = Versioning.getCloudrailVersion();

        // Assert
        assert.equal(version, 'Not installed');
    });

    it('setCloudrailVersion', () => {
        // Arrange
        const expectedVersion = '1.2.345';
        const versionOutputs = [
            `cloudrail, version ${expectedVersion}`,
            `cloudrail, version ${expectedVersion}\n678`,
            `cloudrail, version ${expectedVersion} 678`,
        ];

        // Act / Assert
        versionOutputs.forEach((versionOutput) => {
            Versioning.setCloudrailVersion(versionOutput);
            let actualVersion = Versioning.getCloudrailVersion();
            assert.equal(actualVersion, expectedVersion);
        });
    });
});
