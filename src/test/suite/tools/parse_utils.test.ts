
import { restore } from 'sinon';
import { EvidenceFormat, parseEvidence, parseHtmlLinks, toTitle } from '../../../tools/parse_utils';
import { assert } from 'chai';

describe('parse_utils tests', () => {
    beforeEach( () => {
        restore();
    });

    it('parseHtmlLinks', () => {
        // Arrange
        const raw = 'this is a <link>';
        const expected = 'this is a <a href="link">link</a>';

        // Act
        const actual = parseHtmlLinks(raw);

        // Assert
        assert.equal(actual, expected);
    });

    it('parseHtmlLinks', () => {
        // Arrange
        const raw = 'this is a <link>';
        const expected = 'this is a <a href="link">link</a>';

        // Act
        const actual = parseHtmlLinks(raw);

        // Assert
        assert.equal(actual, expected);
    });

    it('toTitle, lowercase word', () => {
        // Arrange
        const word = 'test';
        const expected = 'Test';

        // Act
        const actual = toTitle(word);

        // Assert
        assert.equal(actual, expected);
    });

    it('toTitle, uppercase word', () => {
        // Arrange
        const word = 'TEST';
        const expected = 'Test';

        // Act
        const actual = toTitle(word);

        // Assert
        assert.equal(actual, expected);
    });

    it('toTitle, lowercase sentence', () => {
        // Arrange
        const sentence = 'test sentence';
        const expected = 'Test Sentence';

        // Act
        const actual = toTitle(sentence);

        // Assert
        assert.equal(actual, expected);
    });

    it('toTitle, uppercase sentence', () => {
        // Arrange
        const sentence = 'TEST SENTENCE';
        const expected = 'Test Sentence';

        // Act
        const actual = toTitle(sentence);

        // Assert
        assert.equal(actual, expected);
    });

    it('toTitle, mixed case word', () => {
        // Arrange
        const word = 'tEsT';
        const expected = 'Test';

        // Act
        const actual = toTitle(word);

        // Assert
        assert.equal(actual, expected);
    });

    it('toTitle, mixed case sentence', () => {
        // Arrange
        const sentence = 'tEsT SeNtEnCe';
        const expected = 'Test Sentence';

        // Act
        const actual = toTitle(sentence);

        // Assert
        assert.equal(actual, expected);
    });

    it('toTitle, numbers', () => {
        // Arrange
        const num = '123';
        const expected = '123';

        // Act
        const actual = toTitle(num);

        // Assert
        assert.equal(actual, expected);
    });

    it('toTitle, mixed sentence with numbers', () => {
        // Arrange
        const sentence = 'a mIxed Sentence wITH num: 123';
        const expected = 'A Mixed Sentence With Num: 123';

        // Act
        const actual = toTitle(sentence);

        // Assert
        assert.equal(actual, expected);
    });

    it('toTitle, paragraph with delimiters', () => {
        // Arrange
        const sentence = 'start line\nsecond line\nwith carriage return\rmixed LF with CR\r\nand a tab\ttabbed';
        const expected = 'Start Line\nSecond Line\nWith Carriage Return\rMixed Lf With Cr\r\nAnd A Tab\tTabbed';

        // Act
        const actual = toTitle(sentence);

        // Assert
        assert.equal(actual, expected);
    });

    it('parsedEvidence, plainText format nothing to parse', () => {
        // Arrange
        const evidence = 'regular sentence';
        const expected = 'regular sentence';

        // Act
        const actual = parseEvidence(evidence, EvidenceFormat.plainText);

        // Assert
        assert.equal(actual, expected);
    });

    it('parsedEvidence, html format nothing to parse', () => {
        // Arrange
        const evidence = 'regular sentence';
        const expected = 'regular sentence';

        // Act
        const actual = parseEvidence(evidence, EvidenceFormat.html);

        // Assert
        assert.equal(actual, expected);
    });

    it('parsedEvidence, plainText format with link', () => {
        // Arrange
        const evidence = 'evidence with a <link>, the rest';
        const expected = 'evidence with a link, the rest';

        // Act
        const actual = parseEvidence(evidence, EvidenceFormat.plainText);

        // Assert
        assert.equal(actual, expected);
    });

    it('parsedEvidence, html format with link', () => {
        // Arrange
        const evidence = 'evidence with a <link>, the rest';
        const expected = 'evidence with a <a href="link">link</a>, the rest';

        // Act
        const actual = parseEvidence(evidence, EvidenceFormat.html);

        // Assert
        assert.equal(actual, expected);
    });

    it('parsedEvidence, plainText format with code', () => {
        // Arrange
        const evidence = 'evidence with a `code block`, the rest';
        const expected = 'evidence with a code block, the rest';

        // Act
        const actual = parseEvidence(evidence, EvidenceFormat.plainText);

        // Assert
        assert.equal(actual, expected);
    });

    it('parsedEvidence, html format with code', () => {
        // Arrange
        const evidence = 'evidence with a `code block`, the rest';
        const expected = 'evidence with a <code>code block</code>, the rest';

        // Act
        const actual = parseEvidence(evidence, EvidenceFormat.html);

        // Assert
        assert.equal(actual, expected);
    });

    it('parsedEvidence, plainText format with newline', () => {
        // Arrange
        const evidence = 'evidence with a newline. the newline';
        const expected = 'evidence with a newline\nthe newline';

        // Act
        const actual = parseEvidence(evidence, EvidenceFormat.plainText);

        // Assert
        assert.equal(actual, expected);
    });

    it('parsedEvidence, html format with newline', () => {
        // Arrange
        const evidence = 'evidence with a newline. the newline';
        const expected = 'evidence with a newline<br>the newline';

        // Act
        const actual = parseEvidence(evidence, EvidenceFormat.html);

        // Assert
        assert.equal(actual, expected);
    });
});