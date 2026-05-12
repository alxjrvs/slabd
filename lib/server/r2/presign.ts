/**
 * SigV4 presigned PUT URL generator for Cloudflare R2.
 *
 * Uses aws4fetch's AwsClient to sign a PUT request so that the upload
 * must be made with the exact Content-Type specified here.
 *
 * 10 MB hard cap: SigV4 query-presigned PUT URLs do not support
 * x-amz-content-length-range (POST-policy feature). We document the cap
 * here; hard enforcement happens at confirm time in cycle-3, which will
 * reject confirms whose recorded object size > 10 MB.
 */

import { AwsClient } from "aws4fetch";

export interface PresignR2PutEnv {
  CF_ACCOUNT_ID: string;
  CF_R2_BUCKET: string;
  CF_R2_ACCESS_KEY_ID: string;
  CF_R2_SECRET_ACCESS_KEY: string;
}

export interface PresignR2PutOptions {
  key: string;
  contentType: string;
  env: PresignR2PutEnv;
  expiresIn: number;
}

/**
 * Generates a SigV4 presigned PUT URL for a Cloudflare R2 object.
 *
 * The `Content-Type` header is signed into the canonical request, so
 * the upload MUST be made with the same Content-Type or R2 will reject it.
 *
 * @returns The presigned URL string.
 */
export async function presignR2Put({
  key,
  contentType,
  env,
  expiresIn,
}: PresignR2PutOptions): Promise<string> {
  const client = new AwsClient({
    accessKeyId: env.CF_R2_ACCESS_KEY_ID,
    secretAccessKey: env.CF_R2_SECRET_ACCESS_KEY,
    // R2 uses the S3-compatible API; service is "s3"
    service: "s3",
    // R2 uses auto region
    region: "auto",
  });

  const endpoint = `https://${env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.CF_R2_BUCKET}/${key}`;
  const url = new URL(endpoint);
  url.searchParams.set("X-Amz-Expires", String(expiresIn));

  const signed = await client.sign(
    new Request(url.toString(), {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
      },
    }),
    {
      aws: { signQuery: true },
    },
  );

  return signed.url;
}
