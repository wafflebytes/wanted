import './lib/env';
import { migrate } from '../src/server/db';
migrate().then(() => { console.log('Database schema is current.'); process.exit(0); }, (e) => { console.error(String(e)); process.exit(1); });
