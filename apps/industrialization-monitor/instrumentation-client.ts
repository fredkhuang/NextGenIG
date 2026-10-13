import { initBotId } from "botid/client/core";

// Vercel BotID: invisible bot check on the submission form's server action, which POSTs to /submit.
// The server side is checkBotId() in app/submit/actions.ts.
initBotId({
  protect: [{ path: "/submit", method: "POST" }],
});
