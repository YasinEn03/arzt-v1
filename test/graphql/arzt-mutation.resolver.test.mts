/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { HttpStatus } from '@nestjs/common';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { beforeAll, describe, expect, inject, test } from 'vitest';
import { baseURL, httpsAgent } from '../constants.mjs';
import { type GraphQLQuery, type GraphQLResponseBody } from './graphql.mjs';

const token = inject('tokenGraphql');
const tokenUser = inject('tokenGraphqlUser');

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const idLoeschen = '40';

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
describe('GraphQL Mutations', () => {
    let client: AxiosInstance;
    const graphqlPath = 'graphql';

    // Axios initialisieren
    beforeAll(async () => {
        client = axios.create({
            baseURL,
            httpsAgent,
        });
    });

    // -------------------------------------------------------------------------
    test('Neuer Arzt', async () => {
        // given
        const authorization = { Authorization: `Bearer ${token}` };
        const body: GraphQLQuery = {
            query: `
                mutation {
                    create(
                        input: {
                            name: "tester",
                            fachgebiet: "RADIOLOGIE",
                            art: RAD,
                            telefonnummer: "+49 1775472213",
                            geburtsdatum: "2022-01-31",
                            schlagwoerter: ["JAVASCRIPT", "TYPESCRIPT"],
                            praxis: {
                                praxis: "test praxis",
                            },
                            patienten: [{
                                name: "Test Patient",
                                geburtsdatum: "2003-03-27",
                                adresse: "Lochfeldstr. 11"
                            }]
                        }
                    ) {
                        id
                      }
                    }  
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body, { headers: authorization });

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.data).toBeDefined();

        const { create } = data.data!;

        // Der Wert der Mutation ist die generierte ID
        expect(create).toBeDefined();
        expect(create.id).toBeGreaterThan(0);
    });

    // -------------------------------------------------------------------------
    test('Arzt mit ungueltigen Werten neu anlegen', async () => {
        // given
        const authorization = { Authorization: `Bearer ${token}` };
        const body: GraphQLQuery = {
            query: `
                mutation {
                    create(
                            input: {
                            name: "1233",
                            fachgebiet: "RAIOLOGIE",
                            art: RAD,
                            telefonnummer: "",
                            geburtsdatum: "2099-01-31",
                            praxis: {
                                praxis: "!=",
                            }
                        }
                    ) {
                        id
                    }
                }
            `,
        };
        const expectedMsg = [
            expect.stringMatching(/^telefonnummer /u),
            expect.stringMatching(/^fachgebiet /u),
            expect.stringMatching(/^praxis.praxis /u),
        ];

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body, { headers: authorization });

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.data!.create).toBeNull();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;

        expect(error).toBeDefined();

        const { message } = error;
        const messages: string[] = message.split(',');

        expect(messages).toBeDefined();
        expect(messages).toHaveLength(expectedMsg.length);
        expect(messages).toStrictEqual(expect.arrayContaining(expectedMsg));
    });

    // -------------------------------------------------------------------------
    test('Arzt aktualisieren', async () => {
        // given
        const authorization = { Authorization: `Bearer ${token}` };
        const body: GraphQLQuery = {
            query: `
                mutation {
                    update(
                        input: {
                            id: 20,
                            version: 0,
                            name: "Updated",
                            fachgebiet: "KARDIOLOGIE",
                            art: KAR,
                            telefonnummer: "+49 17647221312",
                            geburtsdatum: "2001-03-30",
                            schlagwoerter: ["JAVASCRIPT", "TYPESCRIPT"],
                            }
                        )
                            {
                                version
                            }
                        }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body, { headers: authorization });

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.errors).toBeUndefined();

        const { update } = data.data!;

        // Der Wert der Mutation ist die neue Versionsnummer
        expect(update.version).toBe(1);
    });

    // -------------------------------------------------------------------------
    test('Arzt mit ungueltigen Werten aktualisieren', async () => {
        // given
        const authorization = { Authorization: `Bearer ${token}` };
        const id = '40';
        const body: GraphQLQuery = {
            query: `
                mutation {
                    update(
                        input: {
                            id: ${id},
                            version: 0,
                            name: "1231231232",
                            fachgebiet: "A",
                            art: KAR,
                            telefonnummer: "abc",
                            geburtsdatum: "2026-03-30",
                            schlagwoerter: ["JAVASCRIPT", "TYPESCRIPT"],
                            }
                        )
                            {
                                version
                            }
                        }
            `,
        };
        const expectedMsg = [
            expect.stringMatching(/^fachgebiet /u),
            expect.stringMatching(/^telefonnummer /u),
        ];

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body, { headers: authorization });

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.data!.update).toBeNull();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;
        const { message } = error;
        const messages: string[] = message.split(',');

        expect(messages).toBeDefined();
        expect(messages).toHaveLength(expectedMsg.length);
        expect(messages).toStrictEqual(expect.arrayContaining(expectedMsg));
    });

    // -------------------------------------------------------------------------
    test('Nicht-vorhandenen Arzt aktualisieren', async () => {
        // given
        const authorization = { Authorization: `Bearer ${token}` };
        const id = '999999';
        const body: GraphQLQuery = {
            query: `
                mutation {
                    update(
                        input: {
                            id: "${id}",
                            version: 0,
                            name: "Updated",
                            fachgebiet: "KARDIOLOGIE",
                            art: KAR,
                            telefonnummer: "+49 17647221312",
                            geburtsdatum: "2001-03-30",
                            schlagwoerter: ["JAVASCRIPT", "TYPESCRIPT"],
                            }
                        )
                            {
                                version
                            }
                        }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body, { headers: authorization });

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.data!.update).toBeNull();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;

        expect(error).toBeDefined();

        const { message, path, extensions } = error;

        expect(message).toBe(
            `Es gibt kein Arzt mit der ID ${id.toLowerCase()}.`,
        );
        expect(path).toBeDefined();
        expect(path![0]).toBe('update');
        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('BAD_USER_INPUT');
    });

    // -------------------------------------------------------------------------
    test('Arzt loeschen', async () => {
        // given
        const authorization = { Authorization: `Bearer ${token}` };
        const body: GraphQLQuery = {
            query: `
                mutation {
                    delete(id: "${idLoeschen}")
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body, { headers: authorization });

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.errors).toBeUndefined();

        const deleteMutation = data.data!.delete as boolean;

        // Der Wert der Mutation ist true (falls geloescht wurde) oder false
        expect(deleteMutation).toBe(true);
    });

    // -------------------------------------------------------------------------
    test('Arzt loeschen als "user"', async () => {
        // given
        const authorization = { Authorization: `Bearer ${tokenUser}` };
        const body: GraphQLQuery = {
            query: `
                mutation {
                    delete(id: "40")
                }
            `,
        };

        // when
        const {
            status,
            headers,
            data,
        }: AxiosResponse<Record<'errors' | 'data', any>> = await client.post(
            graphqlPath,
            body,
            { headers: authorization },
        );

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);

        const { errors } = data as { errors: any[] };

        expect(errors[0].message).toBe('Forbidden resource');
        expect(errors[0].extensions.code).toBe('BAD_USER_INPUT');
        expect(data.data.delete).toBeNull();
    });
});
