import { HttpStatus } from '@nestjs/common';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { beforeAll, describe, expect, inject, test } from 'vitest';
import { baseURL, httpsAgent } from '../constants.js';

const token = inject('tokenRest');
const tokenUser = inject('tokenRestUser');

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const id = '50';

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
describe('DELETE /rest', () => {
    let client: AxiosInstance;

    // Axios initialisieren
    beforeAll(async () => {
        const restURL = `${baseURL}/rest`;
        client = axios.create({
            baseURL: restURL,
            httpsAgent,
            validateStatus: (status) => status < 500,
        });
    });

    test.concurrent('Vorhandenen Arzt loeschen', async () => {
        // given
        const url = `/${id}`;
        const headers: Record<string, string> = {
            Authorization: `Bearer ${token}`,
        };

        // when
        const { status, data }: AxiosResponse<string> = await client.delete(
            url,
            { headers },
        );

        // then
        expect(status).toBe(HttpStatus.NO_CONTENT);
        expect(data).toBeDefined();
    });

    test.concurrent('Arzt loeschen, aber ohne Token', async () => {
        // given
        const url = `/${id}`;

        // when
        const response: AxiosResponse<Record<string, any>> =
            await client.delete(url);

        // then
        expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    test.concurrent('Arzt loeschen, aber mit falschem Token', async () => {
        // given
        const url = `/${id}`;
        const token = 'FALSCH';
        const headers: Record<string, string> = {
            Authorization: `Bearer ${token}`,
        };

        // when
        const response: AxiosResponse<Record<string, any>> =
            await client.delete(url, { headers });

        // then
        expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    test.concurrent('Vorhandenes Arzt als "user" loeschen', async () => {
        // given
        const url = `/60`;
        const headers: Record<string, string> = {
            Authorization: `Bearer ${tokenUser}`,
        };

        // when
        const response: AxiosResponse<string> = await client.delete(url, {
            headers,
        });

        // then
        expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });
});
