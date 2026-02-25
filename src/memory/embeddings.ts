import dotenv from 'dotenv';
import { config } from '../config.js';

dotenv.config();

const API_KEY = config.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

/**
 * Generates an embedding for a given text string using the raw Gemini REST API.
 * We use text-embedding-004 (768 dimensions).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim() === '') {
        throw new Error('Cannot generate embedding for empty string');
    }

    if (!API_KEY) {
        throw new Error('No Gemini API_KEY provided for embeddings!');
    }

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${API_KEY}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'models/gemini-embedding-001',
                content: {
                    parts: [{ text }]
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini API Error: ${response.status} ${response.statusText} - ${errText}`);
        }

        const data = await response.json();
        const embedding = data.embedding?.values;

        if (embedding && Array.isArray(embedding)) {
            return embedding;
        } else {
            throw new Error('No valid embedding values returned. Payload: ' + JSON.stringify(data));
        }
    } catch (error) {
        console.error('Error generating embedding with REST API:', error);
        throw error;
    }
}
