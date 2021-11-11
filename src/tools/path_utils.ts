import { homedir } from 'os';

export function resolveHomeDir(filepath: string | undefined): string | undefined {
    if (filepath) {
        if (filepath[0] === '~') {
            return filepath.replace('~', homedir());
        }
    }

    return filepath;
}