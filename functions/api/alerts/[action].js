// Cloudflare Pages route for /api/alerts/subscribe and /unsubscribe; the handler
// lives in worker.js. Needs the ALERTS KV namespace bound to the Pages project
// (the one the Worker's cron reads); without it the API answers 404.
import { alertsApi } from '../../../worker.js';

export const onRequest = ({ request, env }) => alertsApi(request, env);
