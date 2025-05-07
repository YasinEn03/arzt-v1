// Copyright (C) 2025 - present Juergen Zimmermann, Hochschule Karlsruhe
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

import { HttpStatus } from '@nestjs/common';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { beforeAll, describe, expect, test } from 'vitest';
import { type Page } from '../../src/arzt/controller/page.js';
import { type Arzt } from '../../src/arzt/entity/arzt.entity.js';
import { baseURL, httpsAgent } from '../constants.js';
import { type ErrorResponse } from './error-response.mjs';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const praxisVorhanden = 'Dr. Müller';
const praxisNichtVorhanden = 'Praxis nicht existent';
const schlagwortVorhanden = 'javascript';
const schlagwortNichtVorhanden = 'csharp';

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
describe('GET /rest', () => {
    let restUrl: string;
    let client: AxiosInstance;

    // Axios initialisieren
    beforeAll(async () => {
        restUrl = `${baseURL}/rest`;
        client = axios.create({
            baseURL: restUrl,
            httpsAgent,
            validateStatus: () => true,
        });
    });

    test.concurrent('Alle Aerzte', async () => {
        // given

        // when
        const { status, headers, data }: AxiosResponse<Page<Arzt>> =
            await client.get('/');

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data).toBeDefined();

        data.content
            .map((arzt) => arzt.id)
            .forEach((id) => {
                expect(id).toBeDefined();
            });
    });

    test.concurrent('Aerzte mit Praxis', async () => {
        // given
        const params = { praxis: praxisVorhanden };

        // when
        const { status, headers, data }: AxiosResponse<Page<Arzt>> =
            await client.get('/', { params });

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data).toBeDefined();

        data.content
            .map((arzt) => arzt.id)
            .forEach((id) => {
                expect(id).toBeDefined();
            });
    });

    test.concurrent('Keine Aerzte mit nicht vorhandener Praxis', async () => {
        // given
        const params = { praxis: praxisNichtVorhanden };

        // when
        const { status, data }: AxiosResponse<ErrorResponse> = await client.get(
            '/',
            { params },
        );

        // then
        expect(status).toBe(HttpStatus.NOT_FOUND);

        const { error, message, statusCode } = data;

        expect(error).toBe('Not Found');
        expect(message).toStrictEqual(expect.stringContaining('Praxis'));
        expect(statusCode).toBe(HttpStatus.NOT_FOUND);
    });

    test.concurrent('Aerzte zu einem vorhandenen Schlagwort', async () => {
        // given
        const params = { [schlagwortVorhanden]: 'true' };
        // when
        const { status, headers, data }: AxiosResponse<Page<Arzt>> =
            await client.get('/', { params });

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data).toBeDefined();
        expect(data.content.length).toBeGreaterThan(0);

        data.content
            .map((arzt) => arzt.schlagwoerter)
            .forEach((schlagwoerter) => {
                expect(schlagwoerter).toBeDefined();
            });
    });

    test.concurrent(
        'Keine Aerzte zu einem nicht vorhandenen Schlagwort',
        async () => {
            // given
            const params = { [schlagwortNichtVorhanden]: 'true' };

            // when
            const { status, data }: AxiosResponse<ErrorResponse> =
                await client.get('/', { params });

            // then
            expect(status).toBe(HttpStatus.NOT_FOUND);

            const { error, statusCode } = data;

            expect(error).toBe('Not Found');
            expect(statusCode).toBe(HttpStatus.NOT_FOUND);
        },
    );

    test.concurrent(
        'Keine Aerzte zu einer nicht-vorhandenen Property',
        async () => {
            // given
            const params = { foo: 'bar' };

            // when
            const { status, data }: AxiosResponse<ErrorResponse> =
                await client.get('/', { params });

            // then
            expect(status).toBe(HttpStatus.NOT_FOUND);

            const { error, statusCode } = data;

            expect(error).toBe('Not Found');
            expect(statusCode).toBe(HttpStatus.NOT_FOUND);
        },
    );
});
