/**
 * Das Modul enthält die Konfiguration für den _Node_-basierten Server.
 * @packageDocumentation
 */

import { hostname } from 'node:os';
import { RESOURCES_DIR, config } from './app.js';
import { env } from './env.js';
import { httpsOptions } from './https.js';

const { NODE_ENV } = env;

const computername = hostname();
const { node } = config;
if (
    node !== undefined &&
    node.port !== undefined &&
    typeof node.port !== 'number'
) {
    throw new TypeError('Der konfigurierte Port ist keine Zahl');
}
const port = (node?.port as number | undefined) ?? 3000; // eslint-disable-line @typescript-eslint/no-magic-numbers

export const nodeConfig = {
    host: computername,
    port,
    resourcesDir: RESOURCES_DIR,
    httpsOptions,
    nodeEnv: NODE_ENV as
        | 'development'
        | 'PRODUCTION'
        | 'production'
        | 'test'
        | undefined,
} as const;
