/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { type GraphQLRequest } from '@apollo/server';
import { HttpStatus } from '@nestjs/common';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { beforeAll, describe, expect, test } from 'vitest';
import { type Arzt, type ArztArt } from '../../src/arzt/entity/arzt.entity.js';
import { baseURL, httpsAgent } from '../constants.js';
import { type GraphQLResponseBody } from './graphql.js';

type ArztDTO = Omit<Arzt, 'patienten' | 'aktualisiert' | 'erzeugt'>;

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const idVorhanden = '1';

const nameVorhanden = 'Max Mustermann';

const praxisVorhanden = 'Dr. Müller';
const praxisNichtVorhanden = 'Musterpraxis';

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite

describe('GraphQL Queries', () => {
    let client: AxiosInstance;
    const graphqlPath = 'graphql';

    // Testserver starten und dabei mit der DB verbinden
    beforeAll(async () => {
        client = axios.create({
            baseURL,
            httpsAgent,
            // auch Statuscode 400 als gueltigen Request akzeptieren, wenn z.B.
            // ein Enum mit einem falschen String getestest wird
            validateStatus: () => true,
        });
    });

    test.concurrent('Arzt zu vorhandener ID', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    arzt(id: "${idVorhanden}") {
                        name
                        version
                        fachgebiet
                        art
                        geburtsdatum
                        schlagwoerter
                        praxis {
                            praxis
                        }
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.errors).toBeUndefined();
        expect(data.data).toBeDefined();

        const { arzt } = data.data! as { arzt: ArztDTO };

        expect(arzt.praxis?.praxis).toMatch(/^\w/u);
        expect(arzt.version).toBeGreaterThan(-1);
        expect(arzt.id).toBeUndefined();
    });

    test.concurrent('Arzt zu nicht vorhandener ID', async () => {
        // given
        const id = '999999';
        const body: GraphQLRequest = {
            query: `
                {
                    arzt(id: "${id}") {
                        praxis {
                            praxis
                        }
                    }
                }
            `,
        };
        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.data!.arzt).toBeNull();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;
        const { message, path, extensions } = error;

        expect(message).toBe(`Es gibt kein Arzt mit der ID ${id}.`);
        expect(path).toBeDefined();
        expect(path![0]).toBe('arzt');
        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('BAD_USER_INPUT');
    });

    test.concurrent('Arzt zu vorhandener Praxis', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    aerzte(suchkriterien: {
                        praxis: "${praxisVorhanden}"
                    }) {
                        praxis {
                            praxis
                        } 
                        art
                    }
                }   
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.errors).toBeUndefined();
        expect(data.data).toBeDefined();

        const { aerzte } = data.data! as { aerzte: ArztDTO[] };

        expect(aerzte).not.toHaveLength(0);
        expect(aerzte).toHaveLength(1);

        const [arzt] = aerzte;

        expect(arzt!.praxis?.praxis).toBe(praxisVorhanden);
    });

    test.concurrent('Arzt zu nicht vorhandenem Praxis', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    aerzte(suchkriterien: {
                        praxis: "${praxisNichtVorhanden}"
                    }) {
                        praxis {
                            praxis
                        }
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.data!.aerzte).toBeNull();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;
        const { message, path, extensions } = error;

        expect(message).toMatch(/^Keine Aerzte gefunden:/u);
        expect(path).toBeDefined();
        expect(path![0]).toBe('aerzte');
        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('BAD_USER_INPUT');
    });

    test.concurrent('Arzt zu vorhandenem NAMEN', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    aerzte(suchkriterien: {
                        name: "${nameVorhanden}"
                    }) {
                        name
                        praxis {
                            praxis
                        }
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.errors).toBeUndefined();
        expect(data.data).toBeDefined();

        const { aerzte } = data.data! as { aerzte: ArztDTO[] };

        expect(aerzte).not.toHaveLength(0);
        expect(aerzte).toHaveLength(1);

        const [arzt] = aerzte;
        const { name, praxis } = arzt!;

        expect(name).toBe(nameVorhanden);
        expect(praxis?.praxis).toBeDefined();
    });

    test.concurrent('Aerzte zur Art "C"', async () => {
        // given
        const arztArt: ArztArt = 'C';
        const body: GraphQLRequest = {
            query: `
                {
                    aerzte(suchkriterien: {
                        art: ${arztArt}
                    }) {
                        art
                        praxis {
                            praxis
                        }
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.errors).toBeUndefined();
        expect(data.data).toBeDefined();

        const { aerzte } = data.data! as { aerzte: ArztDTO[] };

        expect(aerzte).not.toHaveLength(0);

        aerzte.forEach((arzt) => {
            const { art, praxis } = arzt;

            expect(art).toBe(arztArt);
            expect(praxis?.praxis).toBeDefined();
        });
    });

    test.concurrent('Aerzte zur einer ungueltigen Art', async () => {
        // given
        const arztArt = 'UNGUELTIG';
        const body: GraphQLRequest = {
            query: `
                {
                    aerzte(suchkriterien: {
                        art: ${arztArt}
                    }) {
                        praxis {
                            praxis
                        }
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.BAD_REQUEST);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.data).toBeUndefined();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;
        const { extensions } = error;

        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('GRAPHQL_VALIDATION_FAILED');
    });
});
