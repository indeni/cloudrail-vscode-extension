import fs from 'fs';
import util from 'util';

export async function parseJson<T>(filePath: string): Promise<T> {
    const fileContent = await util.promisify(fs.readFile)(filePath, {encoding: 'utf-8'});
    return JSON.parse(fileContent);
}

export function parseHtmlLinks(message: string): string {
    return message.replace(/<.*>/g, (link) => {
        link = link.replace('<', '').replace('>', '');
        return `<a href="${link}">${link}</a>`;
    });
}

export enum EvidenceFormat {
    plainText = 0,
    html = 1
}

const EMPHASIZE = '`'; // code block
const INDENT = '~';
const LINE = '. ';
const LINK = '<';
const CLOSING_LINK = '>';

const EMPHASIZE_REGEX = new RegExp(EMPHASIZE, 'g');
const EMPHASIZE_SENTENCE_REGEX = new RegExp(`${EMPHASIZE}.*${EMPHASIZE}`, 'g');
const LINK_REGEX = new RegExp(LINK, 'g');
const CLOSING_LINK_REGEX = new RegExp(CLOSING_LINK, 'g');
const LINE_REGEX = new RegExp(`\\${LINE}`, 'g');


export function parseEvidence(evidence: string, format: EvidenceFormat): string {
    let parsedEvidence = format === EvidenceFormat.html ? parseHtmlLinks(evidence) : evidence.replace(LINK_REGEX, '').replace(CLOSING_LINK_REGEX, '');

    parsedEvidence = parsedEvidence.replace(EMPHASIZE_SENTENCE_REGEX, (code) => {
        code = code.replace(EMPHASIZE_REGEX, '');
        return format === EvidenceFormat.html ? `<code>${code}</code>` : code.replace(EMPHASIZE_REGEX, '');
    });

    parsedEvidence = parsedEvidence.replace(new RegExp(INDENT, 'g'), '');
    return format === EvidenceFormat.html ? parsedEvidence.replace(LINE_REGEX, '<br>') : parsedEvidence.replace(LINE_REGEX, '\n'); 
}

export function toTitle(str: string): string {
    let parsedString = str.toLowerCase();
    ['\n', '\t', '\r', ' '].forEach( (delimiter: string) => {
        parsedString = parsedString.split(delimiter).map( (word) => {
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(delimiter);
    });

    return parsedString;
}