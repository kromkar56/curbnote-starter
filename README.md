# CurbNote

**Notice it. Make it actionable.** CurbNote turns a real public-space observation into a clear, editable report.

## MVP features

- Issue category, optional location, and observation form
- Server-side hosted-model call through an OpenAI-compatible chat-completions API
- Explicitly labeled template fallback if no model is configured or inference fails
- Editable report, copy action, and local draft history
- Responsive layout
- No login, database, photo upload, or automatic civic submission

## Requirements

- Node.js 18+ (Node 20+ recommended)
- A hosted provider account and API key for live model inference
- A model endpoint that supports the OpenAI-compatible `/chat/completions` request format

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

The frontend runs at the Vite URL shown in the terminal (normally `http://localhost:5173`); Express runs at `http://localhost:8787`.

Without provider credentials, the app uses a **template fallback**, visibly labeled in the UI. This is useful for UI testing but is not an AI demo.

## Configure a hosted open-weight model

Edit `.env`:

```env
PORT=8787
AI_BASE_URL=https://YOUR-PROVIDER.example/v1
AI_API_KEY=your_secret_key
AI_MODEL=your-provider-model-id
DEMO_FALLBACK=true
```

`AI_BASE_URL` is the provider's base URL, excluding `/chat/completions`. Provider model IDs, authentication requirements, request compatibility, access eligibility, rate limits, and license terms vary. Verify the selected provider's current documentation and model terms. The server code expects an OpenAI-compatible chat-completions API; adapt the request if your provider uses a different API.

**Never place the API key in a `VITE_` variable or frontend source code.** The browser calls your server endpoint at `/api/report`; the server calls the model provider.

Set `DEMO_FALLBACK=false` if you want the app to show an error instead of producing a template when AI is unavailable.

## Deploy

Deploy the frontend and API to a host that supports both static Vite output and a Node.js server, or deploy them separately. For separate hosts, set `VITE_API_URL` in the frontend build environment to the backend's public origin (for example, `https://api.example.com`, without `/api/report`) and rebuild the frontend. The backend must be deployed and expose `/api/report`; configure a specific CORS origin in `server/index.js` rather than leaving permissive CORS enabled.

For a simple first deployment, use a Node-compatible host with the start command `npm start` and build command `npm run build`. Set the environment variables in the host dashboard; do not upload `.env`.

## Honest limitations

- The live model feature requires an internet connection.
- Drafts are stored in this browser's localStorage. They are not synced across devices and can be lost if browser data is cleared.
- No report is sent automatically.
- CurbNote does not identify the correct authority, verify an issue, certify accessibility, or guarantee a response.
- The optional location is user-provided; the app does not request GPS permission.
- The template fallback is not model inference and must not be presented as AI output in a demo.

## Demo flow

1. Enter a real observation you have permission to document.
2. Choose its category and provide the location only if you know it.
3. Generate a draft using the configured hosted model.
4. Compare the output against the original facts and edit it.
5. Copy the report and save the draft.
6. Explain that sending and follow-through depend on the relevant reporting channel.

## Challenge story

CurbNote uses an open-weight model to reduce the writing friction between noticing a public-space issue and preparing a report someone can review. The application is intentionally small and model-provider-agnostic. Its next validation step is to test whether real users produce and actually send more useful reports with less effort than their normal workflow.
