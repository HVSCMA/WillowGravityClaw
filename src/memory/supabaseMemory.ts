import { supabase } from './supabaseClient.js';
import { generateEmbedding } from './embeddings.js';

export interface ChatMessage {
    id?: string;
    session_id: string;
    role: 'user' | 'model' | 'assistant' | 'system';
    content: string;
    created_at?: string;
}

// Ephemeral fallback memory if Supabase API keys are missing in production
const ephemeralFallback: Record<string, ChatMessage[]> = {};

/**
 * Saves a new message to the persistent memory store in Supabase or ephemeral fallback.
 */
export async function saveMessage(sessionId: string, role: 'user' | 'model' | 'assistant' | 'system', content: string): Promise<void> {
    if (!sessionId || !content) return;

    if (!ephemeralFallback[sessionId]) {
        ephemeralFallback[sessionId] = [];
    }
    ephemeralFallback[sessionId].push({ session_id: sessionId, role, content, created_at: new Date().toISOString() });

    try {
        let embedding: number[] | null = null;
        try {
            embedding = await generateEmbedding(content);
        } catch (embedError) {
            console.error('[Memory] Warning: Failed to generate embedding. Saving without vector.', embedError);
        }

        const { error } = await supabase.from('messages').insert({
            session_id: sessionId,
            role,
            content,
            embedding
        });

        if (error) {
            console.warn('[Memory] Supabase error (expected in some envs). Falling back to ephemeral.', error.message);
        }
    } catch (err) {
        console.warn('[Memory] Supabase unreachable. Falling back to native ephemeral RAM.', err);
    }
}

/**
 * Retrieves recent chronological messages for a specific session ID to populate immediate context window.
 */
export async function getSessionHistory(sessionId: string, limit: number = 15): Promise<ChatMessage[]> {
    if (!sessionId) return [];

    try {
        const { data, error } = await supabase
            .from('messages')
            .select('role, content, created_at')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: false }) // Get newest first
            .limit(limit);

        if (error || !data || data.length === 0) {
            console.warn('[Memory] Database fetch failed or empty, returning ephemeral memory tier.');
            return (ephemeralFallback[sessionId] || []).slice(-limit) as ChatMessage[];
        }

        // Return ordered oldest-first for the LLM context window
        return (data || []).reverse() as ChatMessage[];
    } catch (err) {
        console.warn('[Memory] Database fetch unreachable, returning ephemeral memory tier.', err);
        return (ephemeralFallback[sessionId] || []).slice(-limit) as ChatMessage[];
    }
}

/**
 * Searches the entire database for messages that semantically match the query text.
 */
export async function searchSimilarMessages(query: string, matchThreshold: number = 0.5, matchCount: number = 15, currentSessionId?: string): Promise<ChatMessage[]> {
    if (!query) return [];

    try {
        const queryEmbedding = await generateEmbedding(query);

        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('RPC Timeout')), 5000));
        const rpcPromise = supabase.rpc('match_messages', {
            query_embedding: queryEmbedding,
            match_threshold: matchThreshold,
            match_count: matchCount,
            exclude_session_id: null
        });

        const { data, error } = await Promise.race([rpcPromise, timeoutPromise]) as any;

        if (error || !data) {
            console.warn('[Memory] Suppressed RPC Error in searchSimilarMessages.');
            return [];
        }

        return data as ChatMessage[];
    } catch (err) {
        console.warn('[Memory] Supabase vector search gracefully bypassed.', err);
        return [];
    }
}

/**
 * Wipes the persistent chronological and semantic memory for a specific session.
 */
export async function clearSessionHistory(sessionId: string): Promise<boolean> {
    if (!sessionId) return false;

    try {
        const { error } = await supabase
            .from('messages')
            .delete()
            .eq('session_id', sessionId);

        if (error) {
            console.error('[Memory] Error clearing session history:', error);
            return false;
        }

        console.log(`[Memory] Successfully wiped context for session: ${sessionId}`);
        return true;
    } catch (err) {
        console.error('[Memory] Unexpected error in clearSessionHistory:', err);
        return false;
    }
}
