/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
    test: {
        name: 'Beispiel',
        // default ist ['**\/*.{test,spec}.?(c|m)[jt]s?(x)']
        include: ['test/**/*.test.mts'],
        globals: true,
        environment: 'node',
        globalSetup: './test/setup.global.mts',
        testTimeout: 10_000,
        coverage: {
            include: ['src/**'],
            exclude: ['src/config/resources/**'],
            extension: ['.mts', '.ts'],
            reporter: ['text', 'html'],
        },
    },
});
