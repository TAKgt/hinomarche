export class JsonRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}

export async function readJsonObject(
  request: Request,
  maxBytes = 16 * 1024,
): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim();
  if (contentType?.toLowerCase() !== "application/json") {
    throw new JsonRequestError(415, "unsupported_media_type");
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new JsonRequestError(413, "payload_too_large");
  }

  const reader = request.body?.getReader();
  if (!reader) throw new JsonRequestError(400, "invalid_request");

  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteLength += value.byteLength;
    if (byteLength > maxBytes) {
      await reader.cancel();
      throw new JsonRequestError(413, "payload_too_large");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new JsonRequestError(400, "invalid_request");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new JsonRequestError(400, "invalid_request");
  }
  return parsed as Record<string, unknown>;
}
