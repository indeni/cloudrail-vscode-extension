import { stub, restore, mock } from 'sinon';
import { CloudrailRunner } from '../../../cloudrail_runner';
import { updateCloudrail } from '../../../commands/update';
import { Versioning } from '../../../tools/versioning';
import * as init from '../../../commands/init';


describe('Command: Update unit tests', () => {
    
    beforeEach(async () => {
        restore();
    });

    it('Successful update', async () => {
        // Arrange
        const version = '1.2.3';
        const setCloudrailVersionExpectation = mock(Versioning)
            .expects("setCloudrailVersion")
            .withArgs(version);
        const initializeEnvironmentExpectation = mock(init)
            .expects("initializeEnvironment")
            .never();

        stub(CloudrailRunner, "updateCloudrail").resolves();
        stub(CloudrailRunner, "getCloudrailVersion").resolves(version);

        // Act
        updateCloudrail();

        // Assert
        await new Promise((resolve) => setTimeout(resolve, 200)); // Is there a better way?
        setCloudrailVersionExpectation.verify();
        initializeEnvironmentExpectation.verify();
    });

    it('updateCloudrail fails, should initialize environment', async () => {
        stub(CloudrailRunner, "updateCloudrail").rejects();
        const initializeEnvironmentExpectation = mock(init)
            .expects("initializeEnvironment")
            .once();
        
        // Act
        updateCloudrail();

        // Assert
        await new Promise((resolve) => setTimeout(resolve, 200)); // Is there a better way?
        initializeEnvironmentExpectation.verify();
    });
});