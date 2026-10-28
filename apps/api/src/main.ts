import { createApp, installShutdown } from './bootstrap.js';
import { loadEnv } from './config/env.js';

const env = loadEnv();
const app = await createApp(env);
installShutdown(app, env);
await app.listen({ port: env.PORT, host: process.env.HOST ?? '0.0.0.0' });
