import { withCorsHeaders } from "../../cors.ts";

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

export function errorResponse(status: number, message: string): Response {
  return jsonResponse(status, { message });
}