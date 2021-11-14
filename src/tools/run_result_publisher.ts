import { CloudrailRunResponse } from '../cloudrail_runner';
import { parseJson } from './parse_utils';
import { RuleResult } from '../cloudrail_run_result_model';
import { RunResultsSubscriber } from '../run_result_subscriber';


export default class RunResultPublisher {

    constructor(private runResultHelpers: RunResultsSubscriber[]) {}

    async assessmentStart(): Promise<void> {
        this.runResultHelpers.forEach((runResultHelper) => {
            runResultHelper.assessmentStart();
        });
    }

    async assessmentFailed(): Promise<void> {
        this.runResultHelpers.forEach((runResultHelper) => {
            runResultHelper.assessmentFailed();
        });
    }
    
    async updateRunResults(runResults: CloudrailRunResponse, terraformWorkingDirectory: string): Promise<void> {
        const ruleResults = await parseJson<RuleResult[]>(runResults.resultsFilePath);
        this.runResultHelpers.forEach((runResultHelper) => {
            runResultHelper.updateRunResults(runResults, ruleResults, terraformWorkingDirectory);
        });
    }
}