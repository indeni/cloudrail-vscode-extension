import { Versioning } from "../tools/versioning";

export function initializeEnvironment(): void {
    // To be set dynamically after installing cloudrail
    Versioning.setCloudrailVersion('cloudrail, version 1.3.606\na Newer version ...');
}