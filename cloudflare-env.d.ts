interface R2ListedObject {
  key: string;
  size?: number;
  uploaded?: string;
}

interface CloudflareEnv {
  ASSETS?: {
    fetch(request: Request): Promise<Response>;
  };
  UPLOADS: {
    put(
      key: string,
      value: ArrayBuffer | ReadableStream | string,
      options?: { httpMetadata?: { contentType?: string } }
    ): Promise<unknown>;
    get(
      key: string,
      options?: { range?: { offset: number; length: number } }
    ): Promise<{
      body: ReadableStream;
      httpMetadata?: { contentType?: string };
      text(): Promise<string>;
    } | null>;
    head(key: string): Promise<{ size: number } | null>;
    list(options?: {
      prefix?: string;
      limit?: number;
      cursor?: string;
    }): Promise<{
      objects: R2ListedObject[];
      truncated: boolean;
      cursor?: string;
    }>;
    delete(key: string): Promise<void>;
  };
  ADMIN_KEY?: string;
  RESEND_API_KEY?: string;
  SALES_SYNC_URL?: string;
  SALES_LEAD_KEY?: string;
  GOOGLE_PLACES_API_KEY?: string;
  AI?: {
    run(model: string, inputs: Record<string, unknown>): Promise<unknown>;
  };
}
