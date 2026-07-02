/**
 * Cloudflare R2 storage helper.
 *
 * Uses the S3-compatible R2 endpoint via @aws-sdk/client-s3. Server-only —
 * never import from a Client Component.
 *
 * Env vars required (see .env.example):
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getR2Config(): {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
} {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 env vars missing — need R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY",
    );
  }
  return { accountId, accessKeyId, secretAccessKey };
}

function getBucketName(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("R2_BUCKET_NAME env var not configured");
  return bucket;
}

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (_client) return _client;
  const { accountId, accessKeyId, secretAccessKey } = getR2Config();
  _client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return _client;
}

/**
 * Upload a file to R2.
 *
 * @param key           object key (use buildPaperKey / buildSyllabusKey)
 * @param body          file contents (Buffer | Uint8Array | string)
 * @param contentType   e.g. "application/pdf"
 * @returns             { key, size (bytes) }
 */
export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string,
): Promise<{ key: string; size: number }> {
  const bucket = getBucketName();
  const client = getClient();
  const bodyBytes: Uint8Array =
    typeof body === "string" ? Buffer.from(body) : body;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: bodyBytes,
      ContentType: contentType,
    }),
  );
  return { key, size: bodyBytes.byteLength };
}

/**
 * Generate a short-lived presigned download URL for a private R2 object.
 *
 * @param key                 object key
 * @param expiresInSeconds    URL validity (default 120s — keep short)
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresInSeconds = 120,
): Promise<string> {
  const bucket = getBucketName();
  const client = getClient();
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Delete an object from R2. No-op (returns) if the object does not exist.
 */
export async function deleteFromR2(key: string): Promise<void> {
  const bucket = getBucketName();
  const client = getClient();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/* ---------- Key builders ---------- */

export interface PaperKeyInput {
  branchCode: string;
  year: number;
  month: number; // 1..12
  subjectCode: string;
  examType: string; // END_SEM | SERIES_1 | SERIES_2 | MODEL
}

/**
 * Build a deterministic storage key for a question paper PDF.
 * Format: `papers/{branch}/{year}/{MM}/{code}-{type}.pdf`
 */
export function buildPaperKey(input: PaperKeyInput): string {
  const { branchCode, year, month, subjectCode, examType } = input;
  const mm = String(month).padStart(2, "0");
  return `papers/${branchCode}/${year}/${mm}/${subjectCode}-${examType}.pdf`;
}

export interface SyllabusKeyInput {
  branchCode: string;
  subjectCode: string;
}

/**
 * Build a deterministic storage key for a syllabus PDF.
 * Format: `syllabus/{branch}/{code}.pdf`
 */
export function buildSyllabusKey(input: SyllabusKeyInput): string {
  return `syllabus/${input.branchCode}/${input.subjectCode}.pdf`;
}
