import { HttpStatus } from '@nestjs/common';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { beforeAll, describe, expect, inject, test } from 'vitest';
import { baseURL, httpsAgent } from '../constants.mjs';
import { type ErrorResponse } from './error-response.mjs';

const token = inject('tokenRest');

// -----------------------------------------------------------------------------
// Testdaten
// -----------------------------------------------------------------------------
const geaenderterArzt = {
    name: 'Dr. Med. Anne Beispiel',
    art: 'C',
    fachgebiet: 'CHIRURGIE',
    telefonnummer: '+49 176 99988877',
    geburtsdatum: '1980-05-15',
    schlagwoerter: ['PYTHON', 'JAVASCRIPT'],
    praxis: {
        praxis: 'Hautarztpraxis Beispielstadt',
        adresse: 'Beispielstraße 2, 54321 Beispielstadt',
        telefonnummer: '+4971112341234',
        email: 'praxis@beispiel.de',
    },
    patienten: [
        {
            name: 'Lena Beispiel',
            geburtsdatum: '2000-02-20',
            telefonnummer: '+4915112345678',
            adresse: 'Ringstraße 5, 54321 Beispielstadt',
            arztId: 30,
        },
    ],
};
const idVorhanden = '30';

const geaenderterArztIdNichtVorhanden = {
    ...geaenderterArzt,
    name: 'Dr. Niemand',
};
const idNichtVorhanden = '999999';

const geaenderterArztInvalid = {
    name: '',
    art: 'XYZ',
    fachgebiet: 'UNBEKANNT',
    telefonnummer: 'abc',
    geburtsdatum: '1234-99-99',
    praxis: {
        praxis: '',
        adresse: 'x'.repeat(300),
        telefonnummer: '000',
        email: 'no-email',
    },
    patienten: [
        {
            name: '',
            geburtsdatum: '31-02-1999',
            telefonnummer: '1234',
            adresse: 'y'.repeat(200),
            arztId: -1,
        },
    ],
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

    test('Vorhandenen Arzt ändern', async () => {
        const url = `/rest/${idVorhanden}`;
        headers.Authorization = `Bearer ${token}`;
        headers['If-Match'] = '"0"';

        const { status, data }: AxiosResponse<string> = await client.put(
            url,
            geaenderterArzt,
            { headers },
        );

        expect(status).toBe(HttpStatus.NO_CONTENT);
        expect(data).toBe('');
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
            expect.stringMatching(/^name /u),
            expect.stringMatching(/^art /u),
            expect.stringMatching(/^fachgebiet /u),
            expect.stringMatching(/^telefonnummer /u),
            expect.stringMatching(/^geburtsdatum /u),
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
