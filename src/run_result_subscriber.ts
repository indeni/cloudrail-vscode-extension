import { CloudrailRunResponse } from './cloudrail_runner';
import { RuleResult } from './cloudrail_run_result_model';

export abstract class RunResultsSubscriber {
    abstract assessmentStart(): Promise<void>;
    abstract updateRunResults(runResults: CloudrailRunResponse, ruleResults: RuleResult[], terraformWorkingDirectory: string): Promise<void>;
    abstract assessmentFailed(): Promise<void>;
}