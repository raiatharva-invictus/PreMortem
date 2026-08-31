import { TrueForge } from '@truefoundry/trueforge-sdk';
const TRUEFORGE_API_KEY = process.env.VITE_TRUEFORGE_API_KEY || '';
const TRUEFORGE_BASE_URL = process.env.VITE_TRUEFORGE_URL || 'http://localhost:8790';
const client = new TrueForge({
    baseUrl: TRUEFORGE_BASE_URL,
    apiKey: TRUEFORGE_API_KEY,
});
async function run() {
    console.log("=== TRUEFORGE DIAGNOSTICS ===");
    try {
        const session = await client.sessions.create({
            agent: {
                spec: {
                    model: { name: 'google/gemini-2.0-flash' },
                    instructions: 'You are a harmless test agent. Reply with exactly the string: PREMORTEM_MODEL_OK',
                }
            }
        });
        console.log("[PASS] Session created: ", session.data.id);
        const stream = await client.sessions.createTurnStream(session.data.id, {
            input: [{ type: 'user.message', content: 'Say the magic word.' }]
        });
        let result = '';
        for await (const chunk of stream) {
            if (chunk.data.type === 'model.message.delta' && chunk.data.content) {
                result += chunk.data.content;
            }
        }
        console.log("[PASS] Model response: ", result);
    }
    catch (e) {
        console.error("[FAIL] Error: ", e);
    }
}
run();
