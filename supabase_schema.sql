-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

drop function if exists match_messages;
drop table if exists messages;

-- Create a table to store your chat messages
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,       -- e.g., FUB Lead ID or Telegram Chat ID
  role text not null,             -- 'user' or 'model' / 'assistant'
  content text not null,          -- The text content of the message
  embedding vector(3072),         -- Gemini gemini-embedding-001 produces 3072 dimensions.
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for faster cosine similarity searches
create index on messages using hnsw (embedding vector_cosine_ops);

-- Create a function to search for messages
create or replace function match_messages (
  query_embedding vector(3072),
  match_threshold float,
  match_count int,
  exclude_session_id text default null
)
returns table (
  id uuid,
  session_id text,
  role text,
  content text,
  similarity float
)
language sql stable
as $$
  select
    messages.id,
    messages.session_id,
    messages.role,
    messages.content,
    1 - (messages.embedding <=> query_embedding) as similarity
  from messages
  where 1 - (messages.embedding <=> query_embedding) > match_threshold
    -- optionally exclude the current session so it doesn't recall what it literally just said
    and (exclude_session_id is null or messages.session_id != exclude_session_id)
  order by messages.embedding <=> query_embedding
  limit match_count;
$$;
