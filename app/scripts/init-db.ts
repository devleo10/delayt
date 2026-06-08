import { initializeSchema } from '../src/lib/db/schema';

initializeSchema()
  .then(() => {
    console.log('Database schema initialized');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed to initialize schema:', err);
    process.exit(1);
  });