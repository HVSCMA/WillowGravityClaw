import dotenv from 'dotenv';
import { supabase } from './src/memory/supabaseClient.js';
import fs from 'fs';

dotenv.config();

async function checkDb() {
    try {
        const { data, error } = await supabase.from('messages').select('*').eq('session_id', 'CROSS_DEVICE_TEST');
        if (error) {
            fs.writeFileSync('db-check.log', 'Error: ' + JSON.stringify(error), 'utf-8');
        } else {
            fs.writeFileSync('db-check.log', JSON.stringify(data, null, 2), 'utf-8');
        }
    } catch (err: any) {
        fs.writeFileSync('db-check.log', 'Exception: ' + err.message, 'utf-8');
    }
    process.exit(0);
}

checkDb();
