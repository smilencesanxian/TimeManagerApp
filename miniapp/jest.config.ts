import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  moduleNameMapper: {
    '^@tarojs/taro$': '<rootDir>/src/__mocks__/taro.ts',
    '^@tarojs/components$': '<rootDir>/src/__mocks__/taroComponents.ts',
    '\\.scss$': '<rootDir>/src/__mocks__/styleMock.ts',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
      },
    }],
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.ts',
    '<rootDir>/src/**/__tests__/**/*.test.tsx',
  ],
  collectCoverageFrom: [
    'src/hooks/**/*.ts',
    'src/store/**/*.ts',
    'src/utils/**/*.ts',
  ],
};

export default config;
