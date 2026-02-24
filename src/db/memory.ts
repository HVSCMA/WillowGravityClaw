import { db } from "./index.js";

interface DbMessage {
    id?: number;
    role: "user" | "model";
    content: string;
    timestamp?: string;
}

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const markdownDbPath = path.join(__dirname, "../../data/memory.md");

export function saveMessage(role: "user" | "model", content: string) {
    const stmt = db.prepare("INSERT INTO messages (role, content) VALUES (?, ?)");
    stmt.run(role, content);

    // Append to Markdown persistence file
    const logEntry = `\n### ${new Date().toISOString()} | ${role.toUpperCase()}\n${content}\n`;
    try {
        fs.appendFileSync(markdownDbPath, logEntry);
    } catch (err) {
        console.error("Failed to write Markdown DB:", err);
    }
}

export function getRecentMessages(limit: number = 20): DbMessage[] {
    const stmt = db.prepare(
        "SELECT * FROM messages ORDER BY timestamp DESC LIMIT ?"
    );
    // We get them in descending order (newest first) to limit them, but we need to
    // return them to the LLM in chronological order (oldest first).
    const rows = stmt.all(limit) as DbMessage[];
    return rows.reverse();
}

export function saveDocument(content: string) {
    const stmt = db.prepare("INSERT INTO documents (content) VALUES (?)");
    stmt.run(content);
}

export function searchDocuments(query: string, limit: number = 5) {
    const stmt = db.prepare(`
    SELECT content FROM documents_fts 
    WHERE documents_fts MATCH escape_fts(?) 
    ORDER BY rank 
    LIMIT ?
  `);

    // A helper function would usually be here to escape double quotes etc,
    // but for a simple FTS5 search we'll just sanitize basic quotes.
    const sanitizedQuery = query.replace(/["']/g, "");
    return stmt.all(sanitizedQuery, limit);
}

// Register a SQLite user-defined function for escaping if needed, 
// or define a simple SQL function wrapper. For FTS5, we can just use the sanitized string.
db.function('escape_fts', (str: string) => {
    return `"${str.replace(/"/g, '""')}"`;
});

export function clearRecentMessages() {
    const stmt = db.prepare("DELETE FROM messages");
    stmt.run();
}

export function getSessionUsageStats(): { messageCount: number; charCount: number } {
    const countStmt = db.prepare("SELECT COUNT(*) as count FROM messages");
    const charStmt = db.prepare("SELECT SUM(LENGTH(content)) as chars FROM messages");

    const countResult = countStmt.get() as { count: number };
    const charResult = charStmt.get() as { chars: number | null };

    return {
        messageCount: countResult.count || 0,
        charCount: charResult.chars || 0
    };
}

export interface GraphTriple {
    subject: string;
    predicate: string;
    object: string;
}

export function addToGraph(triples: GraphTriple[]) {
    const insertStmt = db.prepare("INSERT INTO knowledge_graph (subject, predicate, object) VALUES (?, ?, ?)");

    // Use an explicit transaction to wrap all inserts, maximizing speed and ACID safety if many triples arrive.
    const insertMany = db.transaction((trips: GraphTriple[]) => {
        for (const trip of trips) {
            insertStmt.run(trip.subject, trip.predicate, trip.object);
            console.log(`[Graph] Added Triple: (${trip.subject}) -[${trip.predicate}]-> (${trip.object})`);
        }
    });

    insertMany(triples);
}

export function queryGraph(entity: string): GraphTriple[] {
    const queryStmt = db.prepare(`
        SELECT subject, predicate, object 
        FROM knowledge_graph 
        WHERE subject LIKE ? COLLATE NOCASE
           OR object LIKE ? COLLATE NOCASE 
        ORDER BY timestamp DESC
    `);

    // We add SQLite wildcards to do a loose "includes" match so fuzzy entity names match.
    // E.g., querying 'glenn' will match a subject 'Glenn (User)'.
    const searchParam = `%${entity}%`;
    return queryStmt.all(searchParam, searchParam) as GraphTriple[];
}
