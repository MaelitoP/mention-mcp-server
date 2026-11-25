const severity = { debug: 0, info: 1, warn: 2, error: 3 } as const;

type Level = keyof typeof severity;

function isLevel(value: string | undefined): value is Level {
  return value !== undefined && Object.hasOwn(severity, value);
}

function serialize(time: string, level: Level, msg: string, fields: Record<string, unknown>) {
  try {
    return JSON.stringify({ time, level, msg, ...fields });
  } catch (error) {
    return JSON.stringify({ time, level, msg, serializationError: String(error) });
  }
}

function write(level: Level, msg: string, fields: Record<string, unknown>) {
  const configured = process.env.MCP_LOG_LEVEL;
  if (severity[level] < severity[isLevel(configured) ? configured : "info"]) {
    return;
  }

  process.stderr.write(`${serialize(new Date().toISOString(), level, msg, fields)}\n`);
}

export function logError(message: string, error?: unknown, context?: Record<string, unknown>) {
  write("error", message, {
    context,
    error:
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error,
  });
}

export function logInfo(message: string, context?: Record<string, unknown>) {
  write("info", message, { context });
}

export function logWarn(message: string, context?: Record<string, unknown>) {
  write("warn", message, { context });
}

export function logDebug(message: string, context?: Record<string, unknown>) {
  write("debug", message, { context });
}
