/* eslint-disable @typescript-eslint/naming-convention */
export interface IacResourceMetadata {
    file_name: string;
    start_line: number;
    end_line: number;
}


export interface IacEntity {
    iac_resource_metadata: IacResourceMetadata;
}


export interface IssueItem {
    evidence: string;
    exposed_entity: IacEntity;
    violating_entity: IacEntity;
}


export interface RuleResult {
    rule_name: string;
    status: string;
    enforcement_mode: string;
    iac_remediation_steps: string;
    issue_items: IssueItem[];
}