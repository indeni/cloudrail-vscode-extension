import vscode from 'vscode';
import { stub, restore, mock } from 'sinon';
import { assert } from 'chai';
import { CloudrailRunner } from '../../../cloudrail_runner';
import { initializeEnvironment } from '../../../commands/init';

describe('Command: Init unit tests', () => {
    
    beforeEach(async () => {
        restore();
    });

    it('Python is not installed, Initialization fails', async () => {
        // Arrange
        stub(CloudrailRunner, "initPythonAlias").resolves(false);

        const showErrorMessageExpectation = mock(vscode.window)
            .expects("showErrorMessage")
            .withArgs(
                'Missing prerequisite: python. please install either python3.8, or python3.9 from https://www.python.org/downloads/'
            );

        // Act
        const initialized = await initializeEnvironment(true);

        // Assert
        assert.isNotTrue(initialized);
        showErrorMessageExpectation.verify();
    });

    it('Cloudrail already installed with satisfactory version, Initialization succeeds', async () => {
        // Arrange
        stub(CloudrailRunner, "createVenv").resolves(true);
        stub(CloudrailRunner, "initPythonAlias").resolves(true);
        stub(CloudrailRunner, "setCloudrailVersion").resolves('1.2.3');
        stub(CloudrailRunner, "isCloudrailVersionSatisfactory").returns(true);

        const installCloudrailExpectation = mock(CloudrailRunner).expects("installCloudrail").never();

        // Act
        const initialized = await initializeEnvironment(true);

        // Assert
        assert.isTrue(initialized);
        installCloudrailExpectation.verify();
    }).timeout(10000);

    it('Cloudrail already installed with non-satisfactory version, Initialization succeeds', async () => {
        // Arrange
        stub(CloudrailRunner, "createVenv").resolves(true);
        stub(CloudrailRunner, "initPythonAlias").resolves(true);
        stub(CloudrailRunner, "getCloudrailVersion").resolves('1.2.3');
        stub(CloudrailRunner, "setCloudrailVersion").resolves('1.2.3');
        stub(CloudrailRunner, "isCloudrailVersionSatisfactory").returns(false);

        const installCloudrailExpectation = mock(CloudrailRunner).expects("installCloudrail").once();

        // Act
        const initialized = await initializeEnvironment(true);

        // Assert
        assert.isTrue(initialized);
        installCloudrailExpectation.verify();
    }).timeout(10000);

    it('Cloudrail not installed, Initialization succeeds', async () => {
        // Arrange
        stub(CloudrailRunner, "createVenv").resolves(true);
        stub(CloudrailRunner, "initPythonAlias").resolves(true);
        stub(CloudrailRunner, "setCloudrailVersion").resolves();
        let installCloudrailStub = stub(CloudrailRunner, "installCloudrail").resolves();

        // Act
        const initialized = await initializeEnvironment(true);

        // Assert
        assert.isTrue(initialized);
        assert.isTrue(installCloudrailStub.calledOnce);
    }).timeout(10000);

    it('createVenv throws exception, Initialization fails', async () => {
        // Arrange 
        stub(CloudrailRunner, "initPythonAlias").resolves(true);
        stub(CloudrailRunner, "createVenv").throws('');

        // Act
        const initialized = await initializeEnvironment(true);

        // Assert
        assert.isNotTrue(initialized);
    });

    it('getCloudrailVersion throws exception, Initialization fails', async () => {
        // Arrange 
        stub(CloudrailRunner, "createVenv").resolves(true);
        stub(CloudrailRunner, "initPythonAlias").resolves(true);
        stub(CloudrailRunner, "getCloudrailVersion").throws('');

        // Act
        const initialized = await initializeEnvironment(true);

        // Assert
        assert.isNotTrue(initialized);
    });

    it('installCloudrail throws exception, Initialization fails', async () => {
        // Arrange 
        stub(CloudrailRunner, "createVenv").resolves(true);
        stub(CloudrailRunner, "initPythonAlias").resolves(true);
        stub(CloudrailRunner, "getCloudrailVersion").resolves();
        stub(CloudrailRunner, "installCloudrail").throws('');

        // Act
        const initialized = await initializeEnvironment(true);

        // Assert
        assert.isNotTrue(initialized);
    });

    it('setCloudrailVersion throws exception, Initialization fails', async () => {
        // Arrange 
        stub(CloudrailRunner, "createVenv").resolves(true);
        stub(CloudrailRunner, "initPythonAlias").resolves(true);
        stub(CloudrailRunner, "getCloudrailVersion").resolves('1.2.3');
        stub(CloudrailRunner, "setCloudrailVersion").throws('');

        // Act
        const initialized = await initializeEnvironment(true);

        // Assert
        assert.isNotTrue(initialized);
    });
});