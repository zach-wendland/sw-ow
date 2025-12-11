/// <reference types="node" />

declare namespace NodeJS {
  interface ProcessEnv {
    // App
    NEXT_PUBLIC_APP_URL: string;
    NEXT_PUBLIC_APP_NAME: string;

    // Python API
    ENVIRONMENT: "development" | "staging" | "production";
    DEBUG: string;
    APP_NAME: string;
    APP_VERSION: string;

    // CORS
    CORS_ORIGINS: string;
  }
}
