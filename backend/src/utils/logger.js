class Logger {
  log(level, message, context = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context
    };
    console.log(JSON.stringify(entry));
  }

  info(message, context) {
    this.log('info', message, context);
  }

  warn(message, context) {
    this.log('warn', message, context);
  }

  error(message, error, context) {
    this.log('error', message, {
      ...context,
      error: error?.message || String(error),
      stack: error?.stack
    });
  }
}

export const logger = new Logger();
