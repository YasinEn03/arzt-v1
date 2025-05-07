import { Agent } from 'node:https';
import { nodeConfig } from '../src/config/node.js';
import { paths } from '../src/config/paths.js';

const { host, port } = nodeConfig;

export const baseURL = `https://${host}:${port}`;

export const tokenPath = `${paths.auth}/${paths.token}`;

// fuer selbst-signierte Zertifikate
export const httpsAgent = new Agent({
    requestCert: true,
    rejectUnauthorized: false,
    ca: nodeConfig.httpsOptions.cert as Buffer,
});
