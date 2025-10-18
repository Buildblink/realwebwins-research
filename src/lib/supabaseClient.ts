import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

type ResearchReportRecord = {
  id: string;
  ideaDescription: string;
  summary: string;
  nextSteps: string;
  confidence: number;
  created_at: string;
};

type SupabaseAdapter = {
  from: (
    table: string
  ) => {
    insert: (
      values: unknown
    ) => {
      select: () => {
        single: () => Promise<{
          data: unknown;
          error: { message: string } | null;
        }>;
      };
    };
    select: (
      columns?: string
    ) => {
      order: (
        column: string,
        options?: { ascending?: boolean }
      ) => Promise<{
        data: unknown;
        error: { message: string } | null;
      }>;
    };
  };
};

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const isPlaceholderUrl =
  !supabaseUrl || supabaseUrl.includes('your-supabase-project');
const isPlaceholderKey =
  !supabaseAnonKey || supabaseAnonKey.includes('your-supabase-anon-key');
const hasValidSupabaseUrl =
  typeof supabaseUrl === 'string' &&
  /^https?:\/\//i.test(supabaseUrl) &&
  !isPlaceholderUrl;
const hasValidAnonKey =
  typeof supabaseAnonKey === 'string' &&
  supabaseAnonKey.length > 0 &&
  !isPlaceholderKey;

const dataDir = path.join(process.cwd(), '.data');
const dataFile = path.join(dataDir, 'research_reports.json');

const ensureStorage = () => {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, '[]', 'utf8');
  }
};

const readReports = (): ResearchReportRecord[] => {
  ensureStorage();
  try {
    const raw = fs.readFileSync(dataFile, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeReports = (records: ResearchReportRecord[]) => {
  ensureStorage();
  fs.writeFileSync(dataFile, JSON.stringify(records, null, 2), 'utf8');
};

const createStubSupabase = (): SupabaseAdapter => ({
  from: (table: string) => {
    if (table !== 'research_reports') {
      return {
        insert: () => ({
          select: () => ({
            single: async () => ({
              data: null,
              error: { message: `Unsupported table: ${table}` },
            }),
          }),
        }),
        select: () => ({
          order: async () => ({
            data: null,
            error: { message: `Unsupported table: ${table}` },
          }),
        }),
      };
    }

    return {
      insert: (values: unknown) => {
        const payload = Array.isArray(values) ? values : [values];
        const current = readReports();

        const inserted = payload.map((entry) => {
          const record = entry as Partial<ResearchReportRecord>;
          return {
            id: record.id ?? randomUUID(),
            ideaDescription: String(record.ideaDescription ?? ''),
            summary: String(record.summary ?? ''),
            nextSteps:
              typeof record.nextSteps === 'string'
                ? record.nextSteps
                : JSON.stringify(record.nextSteps ?? []),
            confidence:
              typeof record.confidence === 'number'
                ? record.confidence
                : Number(record.confidence ?? 0),
            created_at:
              record.created_at ?? new Date().toISOString(),
          };
        });

        writeReports([...inserted, ...current]);

        return {
          select: () => ({
            single: async () => ({
              data: inserted[0],
              error: null,
            }),
          }),
        };
      },
      select: () => ({
        order: async (column: string, options?: { ascending?: boolean }) => {
          const records = readReports();
          const sorted = [...records].sort((a, b) => {
            const aValue = (a as Record<string, unknown>)[column];
            const bValue = (b as Record<string, unknown>)[column];

            if (column === 'confidence') {
              const aNumber = Number(aValue ?? 0);
              const bNumber = Number(bValue ?? 0);
              if (aNumber === bNumber) return 0;
              const numericComparison = aNumber > bNumber ? 1 : -1;
              return options?.ascending === false
                ? -numericComparison
                : numericComparison;
            }

            if (column === 'created_at') {
              const aTime = new Date(String(aValue ?? 0)).getTime();
              const bTime = new Date(String(bValue ?? 0)).getTime();
              if (aTime === bTime) return 0;
              const dateComparison = aTime > bTime ? 1 : -1;
              return options?.ascending === false
                ? -dateComparison
                : dateComparison;
            }

            const aText = String(aValue ?? '');
            const bText = String(bValue ?? '');
            if (aText === bText) return 0;
            const textComparison = aText.localeCompare(bText);
            return options?.ascending === false ? -textComparison : textComparison;
          });

          return { data: sorted, error: null };
        },
      }),
    };
  },
});

const supabaseClient =
  hasValidSupabaseUrl && hasValidAnonKey
    ? (createClient(supabaseUrl, supabaseAnonKey) as unknown as SupabaseAdapter)
    : createStubSupabase();

export const supabase: SupabaseAdapter = supabaseClient;
export const isSupabaseStub = !(hasValidSupabaseUrl && hasValidAnonKey);
