---
name: backend-specialist
description: >-
  Architects, optimizes, and secures backend API route handlers, Supabase PostgreSQL schemas,
  Row-Level Security (RLS) policies, and serverless compute pipelines. Use when building or modifying
  Next.js route handlers, optimizing database queries, verifying user authorization, or configuring storage.
---

# Backend and Database Specialist

The Backend and Database Specialist skill governs the design, performance, and security of TATTVA AI's server-side endpoints and PostgreSQL database architecture.

## Architecture & Integration Standards

1. **Next.js 16 Route Handlers**:
   - Reside in `app/api/**/route.ts`.
   - Adhere to async dynamic parameter rules:
     ```typescript
     export async function GET(
       request: Request,
       { params }: { params: Promise<{ id: string }> }
     ) {
       const { id } = await params;
       // ...
     }
     ```
   - Always return typed `NextResponse.json(...)` with explicit HTTP status codes (`200`, `400`, `401`, `403`, `500`).

2. **Supabase & PostgreSQL**:
   - Utilize `@supabase/ssr` with cookie handling in server routes and middleware.
   - Enforce Row-Level Security (RLS) across all user tables:
     - Check `supabase_security_rls_schema.sql` and `supabase_memory_schema.sql` before altering tables.
     - Never bypass RLS in public routes. Verify `auth.uid() = user_id` on all mutating operations.
   - For database connections: Utilize connection pooling to prevent pool exhaustion in serverless edge runtimes.

3. **Authentication & Authorization**:
   - Authenticate incoming requests by checking the Supabase session:
     ```typescript
     const { data: { user }, error } = await supabase.auth.getUser();
     if (error || !user) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
     }
     ```
   - Respect fallback local store permissions (`app/lib/local-auth.ts`) when operating in air-gapped or local mock modes.

4. **Performance & Query Optimization**:
   - Use indexed columns for filtering (`user_id`, `created_at`, `conversation_id`).
   - Limit result set sizes using `.limit(n)` and `.range(from, to)`.
   - Never perform sequential N+1 database queries; batch with `in('id', array)` or SQL joins.

