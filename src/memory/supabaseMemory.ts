import { supabase } from './supabaseClient.js';
import { generateEmbedding } from './embeddings.js';

export interface ChatMessage {
    id?: string;
    session_id: string;
    role: 'user' | 'model' | 'assistant' | 'system';
    content: string;
    created_at?: string;
}

/**
 * Saves a new message to the persistent memory store in Supabase.
 * Generates and stores a unique vector embedding of the text content for future semantic recall.
 */
export async function saveMessage(sessionId: string, role: 'user' | 'model' | 'assistant' | 'system', content: string): Promise<void> {
    if (!sessionId || !content) return;

    try {
        let embedding: number[] | null = null;

        // We generally only care about semantic search over user context or major assistant replies
        // If it's a very short or structural message, we might skip embedding, but here we embed all.
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
            console.error('[Memory] Error saving message to Supabase:', error);
        }
    } catch (err) {
        console.error('[Memory] Unexpected error in saveMessage:', err);
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

        if (error) {
            console.error('[Memory] Error fetching session history:', error);
            return [];
        }

        // Return ordered oldest-first for the LLM context window
        return (data || []).reverse() as ChatMessage[];
    } catch (err) {
        console.error('[Memory] Unexpected error in getSessionHistory:', err);
        return [];
    }
}

/**
 * Searches the entire database for messages that semantically match the query text.
 */
export async function searchSimilarMessages(query: string, matchThreshold: number = 0.5, matchCount: number = 15, currentSessionId?: string): Promise<ChatMessage[]> {
    if (!query) return [];

    try {
        const queryEmbedding = await generateEmbedding(query);

        // Call our postgres RPC function "match_messages"
        const { data, error } = await supabase.rpc('match_messages', {
            query_embedding: queryEmbedding,
            match_threshold: matchThreshold,
            match_count: matchCount,
            exclude_session_id: null // FIX: Allow retrieving memories from the user's own cross-device session
        });

        if (error) {
            console.error('[Memory] RPC Error in searchSimilarMessages:', error);
            return [];
        }

        return data as ChatMessage[];
    } catch (err) {
        console.error('[Memory] Unexpected error in searchSimilarMessages:', err);
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
