import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./tests/e2e',workers:1,timeout:300000,expect:{timeout:15000},use:{baseURL:process.env.E2E_BASE_URL||'http://127.0.0.1:3400',headless:true,screenshot:'only-on-failure'},reporter:'list'});
