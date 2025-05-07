import { type GraphQLRequest } from '@apollo/server';
import { type GraphQLFormattedError } from 'graphql';

export type GraphQLQuery = Pick<GraphQLRequest, 'query'>;

export type GraphQLResponseBody = {
    data?: Record<string, any> | null;
    errors?: readonly [GraphQLFormattedError];
};
