/**
 * Logger service for consistent logging across the application.
 * Can be extended to send logs to external services (Sentry, LogRocket, etc.)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  context?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

class Logger {
  private isDev = process.env.NODE_ENV === 'development';

  private formatMessage(level: LogLevel, message: string, options?: LoggerOptions): string {
    const timestamp = new Date().toISOString();
    const context = options?.context ? `[${options.context}]` : '';
    return `${timestamp} ${level.toUpperCase()} ${context} ${message}`;
  }

  debug(message: string, options?: LoggerOptions): void {
    if (this.isDev) {
      // eslint-disable-next-line no-console
      console.debug(this.formatMessage('debug', message, options), options?.metadata);
    }
  }

  info(message: string, options?: LoggerOptions): void {
    if (this.isDev) {
      // eslint-disable-next-line no-console
      console.info(this.formatMessage('info', message, options), options?.metadata);
    }
  }

  warn(message: string, options?: LoggerOptions): void {
    // eslint-disable-next-line no-console
    console.warn(this.formatMessage('warn', message, options), options?.metadata);
  }

  error(message: string, error?: unknown, options?: LoggerOptions): void {
    // eslint-disable-next-line no-console
    console.error(this.formatMessage('error', message, options), {
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      ...options?.metadata,
    });

    // TODO: Send to error tracking service (Sentry, etc.)
    // if (typeof window !== 'undefined' && window.Sentry) {
    //   window.Sentry.captureException(error);
    // }
  }
}

export const logger = new Logger();
