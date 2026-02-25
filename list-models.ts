import dotenv from 'dotenv';
import { config } from './src/config.js';
import fs from 'fs';

dotenv.config();

const API_KEY = config.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

async function listModels() {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        const models = data.models?.map((m: any) => m.name) || data;
        fs.writeFileSync('models-clean.log', JSON.stringify(models, null, 2), 'utf-8');
    } catch (err: any) {
        fs.writeFileSync('models-clean.log', 'Error: ' + err.message, 'utf-8');
    }
}

listModels();
