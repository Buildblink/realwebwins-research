import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable.");
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const summary = {
  bucketExists: false,
  bucketCreated: false,
  bucketPublic: null,
  policiesEnsured: false,
  uploadSucceeded: false,
  listSucceeded: false,
  filesBeforeCleanup: [],
  filesAfterCleanup: [],
  cleanupAttempted: false,
  cleanupSucceeded: false,
  errors: [],
};

async function fetchBucketDetails() {
  const { data, error } = await supabase.storage.getBucket("reports");

  if (error && error.message !== "Bucket not found") {
    summary.errors.push({
      step: "getBucket",
      message: error.message,
      statusCode: error.status,
    });
    return null;
  }

  if (data) {
    summary.bucketExists = true;
    summary.bucketPublic = data.public ?? null;
  }

  return data;
}

async function ensureBucket() {
  const existingBucket = await fetchBucketDetails();

  if (existingBucket) {
    return;
  }

  const { data: createdBucket, error: createError } = await supabase.storage.createBucket(
    "reports",
    { public: true }
  );

  if (createError) {
    summary.errors.push({
      step: "createBucket",
      message: createError.message,
      statusCode: createError.status,
    });
    return;
  }

  summary.bucketExists = Boolean(createdBucket);
  summary.bucketCreated = Boolean(createdBucket);
  summary.bucketPublic = createdBucket?.public ?? null;

  if (!summary.bucketPublic) {
    await fetchBucketDetails();
  }
}

async function ensurePolicies() {
  const sql = `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND polname = 'Allow public uploads'
      ) THEN
        EXECUTE $policy$
          create policy "Allow public uploads"
          on storage.objects for insert
          to public
          with check (bucket_id = 'reports');
        $policy$;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND polname = 'Allow public read'
      ) THEN
        EXECUTE $policy$
          create policy "Allow public read"
          on storage.objects for select
          to public
          using (bucket_id = 'reports');
        $policy$;
      END IF;
    END
    $$;
  `;

  const response = await fetch(`${supabaseUrl}/postgres/v1/query`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    summary.errors.push({
      step: "ensurePolicies",
      message: errorText || response.statusText,
      statusCode: response.status,
    });
    return;
  }

  summary.policiesEnsured = true;
}

async function uploadTestFile() {
  const testData = {
    test: "connection ok",
    timestamp: new Date().toISOString(),
  };

  const { error } = await supabase.storage.from("reports").upload(
    "test-connection.json",
    Buffer.from(JSON.stringify(testData, null, 2)),
    {
      contentType: "application/json",
      upsert: true,
    }
  );

  if (error) {
    summary.errors.push({
      step: "upload",
      message: error.message,
      statusCode: error.status,
    });
    return;
  }

  summary.uploadSucceeded = true;
}

async function listFiles() {
  const { data, error } = await supabase.storage.from("reports").list();

  if (error) {
    summary.errors.push({
      step: "list",
      message: error.message,
      statusCode: error.status,
    });
    return;
  }

  summary.listSucceeded = true;
  summary.filesBeforeCleanup = (data ?? []).map((entry) => ({
    name: entry.name,
    id: entry.id,
    updatedAt: entry.updated_at,
  }));
}

async function cleanupTestFile() {
  summary.cleanupAttempted = true;
  const { error } = await supabase.storage.from("reports").remove(["test-connection.json"]);

  if (error) {
    summary.errors.push({
      step: "cleanup",
      message: error.message,
      statusCode: error.status,
    });
    return;
  }

  summary.cleanupSucceeded = true;

  const { data, error: listError } = await supabase.storage.from("reports").list();
  if (listError) {
    summary.errors.push({
      step: "postCleanupList",
      message: listError.message,
      statusCode: listError.status,
    });
    return;
  }

  summary.filesAfterCleanup = (data ?? []).map((entry) => ({
    name: entry.name,
    id: entry.id,
    updatedAt: entry.updated_at,
  }));
}

async function main() {
  try {
    await ensureBucket();

    if (!summary.bucketExists) {
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    await ensurePolicies();
    await uploadTestFile();
    await listFiles();

    if (summary.uploadSucceeded) {
      await cleanupTestFile().catch(() => {
        summary.errors.push({
          step: "cleanup",
          message: "Failed to remove test-connection.json after verification.",
        });
      });
    }

    console.log(JSON.stringify(summary, null, 2));
  } catch (err) {
    summary.errors.push({
      step: "unhandled",
      message: err instanceof Error ? err.message : String(err),
    });
    console.log(JSON.stringify(summary, null, 2));
    process.exitCode = 1;
  }
}

await main();
