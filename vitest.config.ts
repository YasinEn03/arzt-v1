/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// https://vitest.dev/config
export default defineConfig({
    test: {
        name: 'Beispiel',
        // default ist ['**\/*.{test,spec}.?(c|m)[jt]s?(x)']
        include: ['test/**/*.test.mts'],
        globals: true,
        environment: 'node',
        // https://vitest.dev/config/#globalsetup
        globalSetup: './test/setup.global.mts',
        testTimeout: 10_000,
        // https://vitest.dev/guide/coverage
        // https://vitest.dev/config/#coverage
        coverage: {
            include: ['src/**'],
            exclude: ['src/config/resources/**'],
            extension: ['.mts', '.ts'],
            // default ist ['text', 'html', 'clover', 'json']
            reporter: ['text', 'html'],
            // default ist 'v8'
            // provider: 'istanbul',
        },
    },
});
