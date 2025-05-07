import { HttpStatus } from '@nestjs/common';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { beforeAll, describe, expect, inject, test } from 'vitest';
import { baseURL, httpsAgent } from '../constants.js';
import { type ErrorResponse } from './error-response.mjs';

const token = inject('tokenRest');

// -----------------------------------------------------------------------------
// Testdaten
// -----------------------------------------------------------------------------
const geaenderterArzt = {
    id: '1',
    version: 0,
    name: 'Hasan Beispiel',
    art: 'RAD',
    fachgebiet: 'RADIOLOGIE',
    telefonnummer: '+49 176 91188877',
    geburtsdatum: '1980-05-15',
    schlagwoerter: ['PYTHON', 'JAVASCRIPT'],
};
const idVorhanden = '10';

const geaenderterArztIdNichtVorhanden = {
    ...geaenderterArzt,
    name: 'Dr. Niemand',
};
const idNichtVorhanden = '999999';

const geaenderterArztInvalid = {
    name: '',
    art: 'KAR',
    fachgebiet: 'UNBEKANNT',
    telefonnummer: 'abc',
    geburtsdatum: '1234-99-99',
    praxis: {
        praxis: '!?',
    },
    patienten: [],
};

const veralteterArzt = {
    ...geaenderterArzt,
};

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------
describe('PUT /rest/:id', () => {
    let client: AxiosInstance;
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    beforeAll(async () => {
        client = axios.create({
            baseURL,
            headers,
            httpsAgent,
            validateStatus: (status) => status < 500,
        });
    });

    test('Nicht-vorhandenen Arzt ändern', async () => {
        const url = `/rest/${idNichtVorhanden}`;
        headers.Authorization = `Bearer ${token}`;
        headers['If-Match'] = '"0"';

        const { status }: AxiosResponse = await client.put(
            url,
            geaenderterArztIdNichtVorhanden,
            { headers },
        );

        expect(status).toBe(HttpStatus.NOT_FOUND);
    });

    test('Vorhandenen Arzt ändern, aber mit ungültigen Daten', async () => {
        const url = `/rest/${idVorhanden}`;
        headers.Authorization = `Bearer ${token}`;
        const expectedMsg = [
            expect.stringMatching(/^fachgebiet /u),
            expect.stringMatching(/^telefonnummer /u),
        ];

        headers['If-Match'] = '"0"';

        const { status, data }: AxiosResponse<{ message: string[] }> =
            await client.put(url, geaenderterArztInvalid, { headers });

        expect(status).toBe(HttpStatus.BAD_REQUEST);

        const messages = data.message as string[];

        expect(messages).toBeDefined();
        expect(messages).toHaveLength(expectedMsg.length);
        expect(messages).toStrictEqual(expect.arrayContaining(expectedMsg));
    });

    test('Vorhandenen Arzt ändern, aber ohne Versionsnummer', async () => {
        const url = `/rest/${idVorhanden}`;
        headers.Authorization = `Bearer ${token}`;
        delete headers['If-Match'];

        const { status, data }: AxiosResponse<string> = await client.put(
            url,
            geaenderterArzt,
            { headers },
        );

        expect(status).toBe(HttpStatus.PRECONDITION_REQUIRED);
        expect(data).toBe('Header "If-Match" fehlt');
    });

    test('Vorhandenen Arzt ändern, aber mit alter Versionsnummer', async () => {
        const url = `/rest/${idVorhanden}`;
        headers.Authorization = `Bearer ${token}`;
        headers['If-Match'] = '"-1"';

        const { status, data }: AxiosResponse<ErrorResponse> = await client.put(
            url,
            veralteterArzt,
            { headers },
        );

        // then
        expect(status).toBe(HttpStatus.PRECONDITION_FAILED);

        const { message, statusCode } = data;

        expect(message).toMatch(/Versionsnummer/u);
        expect(statusCode).toBe(HttpStatus.PRECONDITION_FAILED);
    });

    test('Vorhandenen Arzt ändern, aber ohne Token', async () => {
        const url = `/rest/${idVorhanden}`;
        delete headers.Authorization;
        headers['If-Match'] = '"0"';

        // when
        const response: AxiosResponse<Record<string, any>> = await client.put(
            url,
            geaenderterArzt,
            { headers },
        );

        // then
        expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    test('Vorhandenen Arzt ändern, aber mit falschem Token', async () => {
        const url = `/rest/${idVorhanden}`;
        headers.Authorization = 'Bearer FALSCH';
        headers['If-Match'] = '"0"';

        const response: AxiosResponse<Record<string, any>> = await client.put(
            url,
            geaenderterArzt,
            { headers },
        );

        expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });
});
