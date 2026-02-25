import { saveMessage, getSessionHistory, searchSimilarMessages } from './src/memory/supabaseMemory.js';

async function run() {
    console.log('Testing Supabase Memory Integration...');

    const sessionId = 'test-session-' + Date.now();

    console.log('\n--- 1. Saving Messages ---');
    console.log('Saving message 1...');
    try {
        await saveMessage(sessionId, 'user', 'My absolute favorite car is the Tesla Cybertruck. I love the angular design.');
        console.log('Saving message 2...');
        await saveMessage(sessionId, 'assistant', 'That\'s quite a unique vehicle! The stainless steel exoskeleton is very distinctive.');
        console.log('Saving message 3...');
        await saveMessage(sessionId, 'user', 'I also enjoy hiking on the weekends in the local mountains.');
        console.log('Messages saved.');
    } catch (err) { console.error('Error saving:', err); }

    // Wait for Supabase/OpenAI to process if needed, though inserts are synchronous usually.
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n--- 2. Fetching Session History ---');
    const history = await getSessionHistory(sessionId, 5);
    console.log(JSON.stringify(history, null, 2));

    console.log('\n--- 3. Testing Semantic Search ---');
    const query = 'What kind of cars do I like?';
    console.log(`Searching for: "${query}"`);
    const results = await searchSimilarMessages(query, 0.3, 2);
    console.log(JSON.stringify(results, null, 2));

    process.exit(0);
}

run();
