/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
    test: {
        name: 'Beispiel',
        include: ['test/**/*.{test,spec}.mts'],
        globals: true,
        environment: 'node',
        globalSetup: './test/setup.global.mts',
        testTimeout: 10_000,
        coverage: {
            include: ['src/**', 'test/**'],
            exclude: ['src/config/resources/**'],
            extension: ['.mts', '.ts'],
            reporter: ['text', 'html'],
        },
    },
});
