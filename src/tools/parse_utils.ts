import * as fs from 'fs';
import * as util from 'util';

export async function parseJson<T>(filePath: string): Promise<T> {
    const fileContent = await util.promisify(fs.readFile)(filePath, {encoding: 'utf-8'});
    return JSON.parse(fileContent);
}