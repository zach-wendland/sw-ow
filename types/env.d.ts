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

    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY: string;

    // CORS
    CORS_ORIGINS: string;
  }
}
