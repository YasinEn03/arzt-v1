import { HttpStatus } from '@nestjs/common';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { beforeAll, describe, expect, inject, test } from 'vitest';
import { ArztReadService } from '../../src/arzt/service/arzt-read.service';
import { baseURL, httpsAgent } from '../constants.mjs';
import { type ErrorResponse } from './error-response.mjs';

const token = inject('tokenRest');

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const neuerArzt = {
    name: 'Dr. Bernd Brot',
    art: 'C',
    fachgebiet: 'KARDIOLOGIE',
    telefonnummer: '+49 176 89227837',
    geburtsdatum: '2003-03-27',
    schlagwoerter: ['JAVA', 'TYPESCRIPT'],
    praxis: {
        praxis: 'Musterpraxis Karlsruhe',
        adresse: 'Hauptstraße 1, 76133 Karlsruhe',
        telefonnummer: '+4972112345678',
        email: 'kontakt@musterpraxis.de',
    },
    patienten: [
        {
            name: 'Max Mustermann',
            geburtsdatum: '1990-01-01',
            telefonnummer: '+491771234567',
            adresse: 'Beispielweg 10, 12345 Berlin',
            arztId: 1,
        },
        {
            name: 'Erika Musterfrau',
            geburtsdatum: '1985-05-05',
            arztId: 1,
        },
    ],
};

const neuerArztInvalid = {
    name: '',
    art: 'FALSCH',
    fachgebiet: 'KEIN-FACH',
    telefonnummer: 'abc',
    geburtsdatum: '31-02-2025', // ungültiges Datum
    schlagwoerter: ['DOPPEL', 'DOPPEL'],
    praxis: {
        praxis: '',
        adresse: 'x'.repeat(300),
        telefonnummer: '000',
        email: 'keinemail',
    },
    patienten: [
        {
            name: '',
            geburtsdatum: '30-02-1999',
            telefonnummer: '1111',
            adresse: 'a'.repeat(200),
            arztId: -1,
        },
    ],
};

const neuerArztExistiert = {
    ...neuerArzt,
    name: 'Dr. Bernd Brot', // existiert bereits
};

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
describe('POST /rest', () => {
    let client: AxiosInstance;
    const restURL = `${baseURL}/rest`;
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    beforeAll(() => {
        client = axios.create({
            baseURL: restURL,
            httpsAgent,
            validateStatus: (status) => status < 500,
        });
    });

    test('Neuer Arzt', async () => {
        //given
        headers.Authorization = `Bearer ${token}`;

        //when
        const response: AxiosResponse<string> = await client.post(
            '',
            neuerArzt,
            { headers },
        );

        // then
        const { status, data } = response;

        expect(status).toBe(HttpStatus.CREATED);

        const { location } = response.headers as { location: string };

        expect(location).toBeDefined();

        // ID nach dem letzten "/"
        const indexLastSlash: number = location.lastIndexOf('/');

        expect(indexLastSlash).not.toBe(-1);

        const idStr = location.slice(indexLastSlash + 1);

        expect(idStr).toBeDefined();
        expect(ArztReadService.ID_PATTERN.test(idStr)).toBe(true);

        expect(data).toBe('');
    });

    test.concurrent('Neuer Arzt mit ungültigen Daten', async () => {
        //given
        headers.Authorization = `Bearer ${token}`;

        const expectedMsg = [
            expect.stringMatching(/^name /u),
            expect.stringMatching(/^art /u),
            expect.stringMatching(/^fachgebiet /u),
            expect.stringMatching(/^telefonnummer /u),
            expect.stringMatching(/^geburtsdatum /u),
        ];

        // when
        const response: AxiosResponse<Record<string, any>> = await client.post(
            '',
            neuerArztInvalid,
            { headers },
        );

        // then
        const { status, data } = response;

        expect(status).toBe(HttpStatus.BAD_REQUEST);

        const messages = data.message as string[];

        expect(messages).toBeDefined();
        expect(messages).toHaveLength(expectedMsg.length);
        expect(messages).toStrictEqual(expect.arrayContaining(expectedMsg));
    });

    test.concurrent('Neuer Arzt, aber Name existiert bereits', async () => {
        headers.Authorization = `Bearer ${token}`;

        const response: AxiosResponse<ErrorResponse> = await client.post(
            '',
            neuerArztExistiert,
            { headers },
        );

        const { data } = response;

        const { message, statusCode } = data;

        expect(message).toStrictEqual(expect.stringContaining('ISBN'));
        expect(statusCode).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    });

    test.concurrent('Neuer Arzt ohne Token', async () => {
        // when
        const response: AxiosResponse<Record<string, any>> = await client.post(
            '',
            neuerArzt,
        );

        // then
        expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    test.concurrent('Neuer Arzt mit falschem Token', async () => {
        // given
        const token = 'FALSCH';
        headers.Authorization = `Bearer ${token}`;

        // when
        const response: AxiosResponse<Record<string, any>> = await client.post(
            '',
            neuerArzt,
            { headers },
        );

        // then
        expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    test.concurrent.todo('Abgelaufener Token');
});
