/** Loads .env.local / .env for scripts (Expo loads them itself for the app). */
import { config as load } from 'dotenv';

load({ path: '.env.local', quiet: true });
load({ path: '.env', quiet: true });
