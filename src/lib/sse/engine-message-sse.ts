export type EngineMessageKind =
  | "positionDynamics"
  | "armsTargetGRIs"
  | "unknown";

export interface EngineMessageSseClientOptions {
  url: string;
  withCredentials?: boolean;
  onOpen?: () => void;
  onError?: (event: Event) => void;
  onRawMessage?: (payload: string, event: MessageEvent<string>) => void;
  onParsedMessage?: (
    message: unknown,
    kind: EngineMessageKind,
    event: MessageEvent<string>,
  ) => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function detectEngineMessageKind(message: unknown): EngineMessageKind {
  if (!isRecord(message)) {
    return "unknown";
  }

  const info = message.info;
  if (!Array.isArray(info) || info.length === 0) {
    return "unknown";
  }

  const firstItem = info[0];
  if (!isRecord(firstItem)) {
    return "unknown";
  }

  if ("positionDynamics" in firstItem) {
    return "positionDynamics";
  }

  if ("armsTargetGRIs" in firstItem) {
    return "armsTargetGRIs";
  }

  return "unknown";
}

export class EngineMessageSseClient {
  private readonly options: EngineMessageSseClientOptions;
  private eventSource: EventSource | null = null;
  private static readonly eventNames = [
    "message",
    "connected",
    "engine-message",
    "engine-lifecycle",
  ] as const;

  constructor(options: EngineMessageSseClientOptions) {
    this.options = options;
  }

  connect(): void {
    if (this.eventSource) {
      return;
    }

    const eventSource = new EventSource(this.options.url, {
      withCredentials: this.options.withCredentials ?? false,
    });

    eventSource.onopen = () => {
      console.log("[EngineMessageSseClient] connected:", this.options.url);
      this.options.onOpen?.();
    };

    for (const eventName of EngineMessageSseClient.eventNames) {
      eventSource.addEventListener(eventName, (event) => {
        this.handleMessage(event as MessageEvent<string>);
      });
    }

    eventSource.onerror = (event) => {
      console.error("[EngineMessageSseClient] error:", event);
      this.options.onError?.(event);
    };

    this.eventSource = eventSource;
  }

  disconnect(): void {
    if (!this.eventSource) {
      return;
    }

    this.eventSource.close();
    this.eventSource = null;
    console.log("[EngineMessageSseClient] disconnected");
  }

  isConnected(): boolean {
    return this.eventSource !== null;
  }

  handleMockMessage(message: unknown, source: string): void {
    const kind = detectEngineMessageKind(message);
    console.log(`[EngineMessageSseClient] mock message from ${source}:`, {
      kind,
      message,
    });
    this.options.onParsedMessage?.(
      message,
      kind,
      new MessageEvent<string>("message", {
        data: JSON.stringify(message),
      }),
    );
  }

  private handleMessage(event: MessageEvent<string>): void {
    console.log("[EngineMessageSseClient] received SSE event:", event.type);
    this.options.onRawMessage?.(event.data, event);

    try {
      const parsedMessage: unknown = JSON.parse(event.data);
      const kind = detectEngineMessageKind(parsedMessage);
      console.log("[EngineMessageSseClient] received message:", {
        kind,
        message: parsedMessage,
      });
      this.options.onParsedMessage?.(parsedMessage, kind, event);
    } catch (error) {
      console.error("[EngineMessageSseClient] failed to parse message:", error);
      console.log("[EngineMessageSseClient] raw payload:", event.data);
    }
  }
}

export function createEngineMessageSseClient(
  options: EngineMessageSseClientOptions,
): EngineMessageSseClient {
  return new EngineMessageSseClient(options);
}
