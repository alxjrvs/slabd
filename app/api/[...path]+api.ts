/**
 * Expo Router API catch-all.
 *
 * Delegates the entire /api/* subtree to the Hono app.
 * Expo Router passes a standard Request object; Hono returns a standard
 * Response — no adapter needed.
 *
 * AC-3: Expo Router catch-all wiring for Hono.
 */

import { createApp } from "~/lib/server/app";

const app = createApp();

export async function GET(request: Request): Promise<Response> {
  return app.fetch(request);
}

export async function POST(request: Request): Promise<Response> {
  return app.fetch(request);
}

export async function PUT(request: Request): Promise<Response> {
  return app.fetch(request);
}

export async function DELETE(request: Request): Promise<Response> {
  return app.fetch(request);
}

export async function PATCH(request: Request): Promise<Response> {
  return app.fetch(request);
}
