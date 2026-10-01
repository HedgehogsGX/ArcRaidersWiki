// Cloudflare Pages route for /news-full/<file>; the handler lives in worker.js,
// which serves the same route on Cloudflare Workers.
import { newsFull } from '../../worker.js';

export const onRequest = ({ request }) => newsFull(request);
