import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import path from 'node:path';
import { RESOURCES_DIR } from './app.js';

const schemaGraphQL = path.join(RESOURCES_DIR, 'graphql', 'schema.graphql');
console.debug('schemaGraphQL = %s', schemaGraphQL);

/**
 * Das Konfigurationsobjekt für GraphQL (siehe src\app.module.ts).
 */
export const graphQlModuleOptions: ApolloDriverConfig = {
    typePaths: [schemaGraphQL],
    // alternativ: Mercurius (statt Apollo) fuer Fastify (statt Express)
    driver: ApolloDriver,
    playground: false,
    // TODO formatError und logger konfigurieren, damit UserInputError nicht in der Konsole protokolliert wird
};
