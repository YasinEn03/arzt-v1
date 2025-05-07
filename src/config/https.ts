import { readFileSync } from 'node:fs';
import path from 'node:path';
import { RESOURCES_DIR } from './app.js';

const tlsDir = path.resolve(RESOURCES_DIR, 'tls');
console.debug('tlsDir = %s', tlsDir);

let httpsOptions = {};

// Nur TLS-Optionen laden, wenn wir nicht in der Testumgebung sind
if (process.env.NODE_ENV !== 'test') {
    httpsOptions = {
        key: readFileSync(path.resolve(tlsDir, 'key.pem')),
        cert: readFileSync(path.resolve(tlsDir, 'certificate.crt')),
    };
}

export { httpsOptions };
