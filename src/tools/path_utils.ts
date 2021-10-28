import { homedir } from 'os';

export function resolveHomeDir(filepath: string | undefined): string | undefined {
    if (typeof filepath === 'string') {
        if (filepath[0] === '~') {
            return filepath.replace('~', homedir());
        }
    }

    return filepath;
}