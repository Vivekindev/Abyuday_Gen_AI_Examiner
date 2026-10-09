import 'dotenv/config';
import connectDB from './db/db.js';
import startTaskWorker from './functions/watchPendingTasks.js';
import startEmailWorker from './functions/emailing/worker.js';

connectDB().then(() => {
  console.log('Task worker started');
  const timer = startTaskWorker();
  const mailTimer = startEmailWorker();
  const stop = () => { clearInterval(timer); clearInterval(mailTimer); process.exit(0); };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}).catch((error) => { console.error('Worker startup failed:', error); process.exitCode = 1; });
