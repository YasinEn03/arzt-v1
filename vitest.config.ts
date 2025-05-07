/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
    test: {
        name: 'Beispiel',
        include: ['test/**/*.{test,spec}.{ts,js,mts}'],
        globals: true,
        environment: 'node',
        globalSetup: './test/setup.global.ts',
        testTimeout: 10_000,
        coverage: {
            include: ['src/**', 'test/**'],
            exclude: ['src/config/resources/**'],
            extension: ['.mts', '.ts'],
            reporter: ['text', 'html'],
        },
    },
});
