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

export function parseEvidence(evidence: string, format: EvidenceFormat): string {
    let parsedEvidence = format === EvidenceFormat.html ? parseHtmlLinks(evidence) : evidence.replace(/</g, '').replace(/>/g, '');

    parsedEvidence = parsedEvidence.replace(/`.*`/g, (code) => {
        code = code.replace(/`/g, '');
        return format === EvidenceFormat.html ? `<code>${code}</code>` : code.replace(/`/g, '');
    });

    parsedEvidence = parsedEvidence.replace(/~/g, '');
    return format === EvidenceFormat.html ? parsedEvidence.replace(/\.\s/g, '<br>') : parsedEvidence.replace(/\.\s/g, '\n'); 
}

function getTab(format: EvidenceFormat): string {
    return format === EvidenceFormat.html ? '&nbsp;&nbsp;&nbsp;&nbsp;|' : '';
}