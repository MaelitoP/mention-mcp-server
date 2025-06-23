import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import pino from "pino";

function getLogDirectory(): string {
  const platform = process.platform;
  let logDir: string;

  if (platform === "darwin") {
    logDir = join(homedir(), "Library", "Logs", "mention-mcp-server");
  } else if (platform === "win32") {
    logDir = join(homedir(), "AppData", "Local", "mention-mcp-server", "logs");
  } else {
    logDir = join(homedir(), ".local", "share", "mention-mcp-server", "logs");
  }

  // Ensure log directory exists
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }

  return logDir;
}

const logLevel = process.env.MCP_LOG_LEVEL || "info";
const enableConsoleLogging = process.env.MCP_CONSOLE_LOGGING === "true";

const logDir = getLogDirectory();
const logFile = join(logDir, "mention-mcp-server.log");

export const logger = pino(
  {
    level: logLevel,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
  },
  pino.multistream([
    {
      stream: pino.destination({
        dest: logFile,
        sync: false,
      }),
    },
    ...(enableConsoleLogging
      ? [
          {
            stream: pino.destination({
              dest: 1,
              sync: false,
            }),
          },
        ]
      : []),
  ])
);

export function logError(message: string, error?: unknown, context?: Record<string, unknown>) {
  const errorData = {
    message,
    context,
    error:
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error,
  };

  logger.error(errorData, message);
}

export function logInfo(message: string, context?: Record<string, unknown>) {
  logger.info({ context }, message);
}

export function logWarn(message: string, context?: Record<string, unknown>) {
  logger.warn({ context }, message);
}

export function logDebug(message: string, context?: Record<string, unknown>) {
  logger.debug({ context }, message);
}
