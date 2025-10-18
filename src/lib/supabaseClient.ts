import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type TableName = "research_projects" | "feedback";

type ResearchProjectRow = {
  id: string;
  user_id: string | null;
  title: string;
  idea_description: string;
  score: number | null;
  verdict: string | null;
  confidence: string | null;
  research_json: unknown;
  research_report: string | null;
  created_at: string;
};

type FeedbackRow = {
  id: string;
  name: string | null;
  message: string;
  rating: number | null;
  created_at: string;
};

type RowMap = {
  research_projects: ResearchProjectRow;
  feedback: FeedbackRow;
};

type NormalizedPayload<T extends TableName> = Partial<RowMap[T]> & Record<string, unknown>;

type SupabaseAdapter = {
  from<T extends TableName>(table: T): {
    insert(
      values: NormalizedPayload<T> | NormalizedPayload<T>[]
    ): {
      select: (columns?: string) => {
        single: () => Promise<{
          data: RowMap[T] | null;
          error: { message: string } | null;
        }>;
      };
    };
    select(columns?: string): StubQuery<T>;
  };
};

const dataDir = path.join(process.cwd(), ".data");

function tableFile(table: TableName) {
  return path.join(dataDir, `${table}.json`);
}

function ensureStorage(table: TableName) {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const filePath = tableFile(table);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "[]", "utf8");
  }
}

function readTable<T extends TableName>(table: T): RowMap[T][] {
  ensureStorage(table);
  try {
    const raw = fs.readFileSync(tableFile(table), "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as RowMap[T][];
    }
  } catch {
    // ignore and return empty
  }
  return [];
}

function writeTable<T extends TableName>(table: T, rows: RowMap[T][]) {
  ensureStorage(table);
  fs.writeFileSync(tableFile(table), JSON.stringify(rows, null, 2), "utf8");
}

function normalizeResearchProject(
  payload: NormalizedPayload<"research_projects">
): ResearchProjectRow {
  const score =
    typeof payload.score === "number"
      ? payload.score
      : payload.score != null
      ? Number(payload.score)
      : null;

  return {
    id:
      typeof payload.id === "string" && payload.id.length > 0
        ? payload.id
        : randomUUID(),
    user_id:
      typeof payload.user_id === "string" && payload.user_id.length > 0
        ? payload.user_id
        : null,
    title: String(payload.title ?? "").slice(0, 200),
    idea_description: String(payload.idea_description ?? ""),
    score: Number.isFinite(score) ? Number(score) : null,
    verdict:
      typeof payload.verdict === "string" && payload.verdict.length > 0
        ? payload.verdict
        : null,
    confidence:
      typeof payload.confidence === "string" && payload.confidence.length > 0
        ? payload.confidence
        : null,
    research_json: payload.research_json ?? null,
    research_report:
      typeof payload.research_report === "string" &&
      payload.research_report.length > 0
        ? payload.research_report
        : null,
    created_at:
      typeof payload.created_at === "string" && payload.created_at.length > 0
        ? payload.created_at
        : new Date().toISOString(),
  };
}

function normalizeFeedback(payload: NormalizedPayload<"feedback">): FeedbackRow {
  const ratingValue =
    typeof payload.rating === "number"
      ? payload.rating
      : payload.rating != null
      ? Number(payload.rating)
      : null;

  const rating =
    ratingValue != null && Number.isFinite(ratingValue)
      ? Math.min(Math.max(Math.round(ratingValue), 1), 5)
      : null;

  return {
    id:
      typeof payload.id === "string" && payload.id.length > 0
        ? payload.id
        : randomUUID(),
    name:
      typeof payload.name === "string" && payload.name.trim().length > 0
        ? payload.name.trim()
        : null,
    message: String(payload.message ?? "").trim(),
    rating,
    created_at:
      typeof payload.created_at === "string" && payload.created_at.length > 0
        ? payload.created_at
        : new Date().toISOString(),
  };
}

class StubQuery<T extends TableName> {
  private rows: RowMap[T][];

  constructor(private readonly table: T, initialRows: RowMap[T][]) {
    this.rows = [...initialRows];
  }

  select(columns?: string) {
    void columns;
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    const ascending = options?.ascending !== false;
    this.rows.sort((a, b) => {
      const aValue = (a as Record<string, unknown>)[column];
      const bValue = (b as Record<string, unknown>)[column];
      if (aValue === bValue) return 0;

      if (typeof aValue === "number" && typeof bValue === "number") {
        return ascending ? aValue - bValue : bValue - aValue;
      }

      const aString = String(aValue ?? "");
      const bString = String(bValue ?? "");
      return ascending
        ? aString.localeCompare(bString)
        : bString.localeCompare(aString);
    });
    return this;
  }

  limit(count: number) {
    this.rows = this.rows.slice(0, count);
    return this;
  }

  eq(column: string, value: unknown) {
    this.rows = this.rows.filter(
      (row) => (row as Record<string, unknown>)[column] === value
    );
    return this;
  }

    async single(): Promise<{
      data: RowMap[T] | null;
      error: { message: string } | null;
    }> {
      const item = this.rows[0];
      if (!item) {
      return {
        data: null,
        error: { message: "No rows found" },
      };
    }
    return { data: item, error: null };
  }

  then<TResult1 = { data: RowMap[T][]; error: null }, TResult2 = never>(
    onfulfilled?:
      | ((value: {
          data: RowMap[T][];
          error: null;
        }) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null
  ) {
    return Promise.resolve({ data: this.rows, error: null }).then(
      onfulfilled,
      onrejected
    );
  }
}

function createStubSupabase(): SupabaseAdapter {
  return {
    from<T extends TableName>(tableName: T) {
      if (tableName !== "research_projects" && tableName !== "feedback") {
        throw new Error(`Unsupported table in stub: ${tableName}`);
      }

      return {
        insert(values) {
          const payloads = Array.isArray(values) ? values : [values];
          const currentRows = readTable(tableName);
          const inserted = payloads.map((payload) => {
            if (tableName === "research_projects") {
              return normalizeResearchProject(
                payload as NormalizedPayload<"research_projects">
              );
            }
            return normalizeFeedback(payload as NormalizedPayload<"feedback">);
          }) as RowMap[T][];

          writeTable(tableName, [...inserted, ...currentRows]);

          return {
            select(columns?: string) {
              void columns;
              return {
                single: async () => ({
                  data: inserted[0] ?? null,
                  error: inserted[0] ? null : { message: "Insert failed" },
                }),
              };
            },
          };
        },
        select(columns?: string) {
          void columns;
          const rows = readTable(tableName);
          return new StubQuery(tableName, rows);
        },
      };
    },
  };
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const shouldUseStub =
  !supabaseUrl ||
  !supabaseAnonKey ||
  supabaseUrl.includes("your-supabase-project") ||
  process.env.SUPABASE_USE_STUB === "true";

const supabaseClient: SupabaseClient | SupabaseAdapter = shouldUseStub
  ? createStubSupabase()
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

export const supabase = supabaseClient;
export const isSupabaseStub = shouldUseStub;
export type { SupabaseAdapter };
