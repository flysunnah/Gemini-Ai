# Gemini Chatbot — Fly Sunnah

A small browser chat interface backed by a server-side Google Gemini API proxy.

## Deploy on Vercel

1. Import this repository into Vercel.
2. In **Project Settings → Environment Variables**, add:
   - `GEMINI_API_KEY`: a newly generated Google Gemini API key
   - `GEMINI_MODEL` (optional): model ID; defaults to `gemini-2.5-flash`
3. Redeploy after setting the environment variables.

The API key must remain server-side. Do not add it to `script.js`, HTML, or any other browser-delivered file.

## Local development

Use Vercel's local development runtime so that the `/api/gemini` serverless function is available. Set `GEMINI_API_KEY` in your local environment before starting the runtime.

## API

- `POST /api/gemini` accepts `{ "message": "..." }`.
- The server validates input, reads the key from the environment, calls Gemini, and returns `{ "text": "..." }`.
- Requests are same-origin only when an Origin header is supplied.
- The server never returns the provider key to the browser.

## Security note

A previous revision contained a browser-exposed API key. Removing it from the current source does not erase it from Git history. Revoke that old key and create a replacement before deployment. Do not reuse the exposed key.
