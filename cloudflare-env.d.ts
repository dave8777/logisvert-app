interface R2ListedObject {
  key: string;
  size?: number;
  uploaded?: string;
}

interface CloudflareEnv {
  UPLOADS: {
    put(
      key: string,
      value: ArrayBuffer | ReadableStream | string,
      options?: { httpMetadata?: { contentType?: string } }
    ): Promise<unknown>;
    get(key: string): Promise<{
      body: ReadableStream;
      httpMetadata?: { contentType?: string };
      text(): Promise<string>;
    } | null>;
    list(options?: {
      prefix?: string;
      limit?: number;
      cursor?: string;
    }): Promise<{
      objects: R2ListedObject[];
      truncated: boolean;
      cursor?: string;
    }>;
  };
  ADMIN_KEY?: string;
  RESEND_API_KEY?: string;
}
