import winston from 'winston';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define which transports the logger must use
const transports: winston.transport[] = [
  // Console transport for local development
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
      winston.format.colorize({ all: true }),
      winston.format.printf(info => {
        const { timestamp, level, message, ...meta } = info;
        const metaStr =
          Object.keys(meta).length > 0
            ? ` ${JSON.stringify(meta, null, 2)}`
            : '';
        return `${timestamp} ${level}: ${message}${metaStr}`;
      }),
    ),
  }),
];

// Add file transport for production if not in Lambda
if (
  process.env.NODE_ENV === 'production' &&
  !process.env.AWS_LAMBDA_FUNCTION_NAME
) {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  );
}

// Create the logger
const logger = winston.createLogger({
  level:
    process.env.LOG_LEVEL ||
    (process.env.IS_LOCAL === 'true' ? 'debug' : 'info'),
  levels,
  transports,
  // Do not exit on handled exceptions
  exitOnError: false,
});

// Debug: Log the current log level (remove this line in production)
// console.log(`🔧 Winston logger initialized with level: ${logger.level}`);

// Create a stream object with a 'write' function that will be used by morgan
export const stream = {
  write: (message: string) => {
    // Use the 'http' log level so the output will be picked up by both transports
    logger.http(message.substring(0, message.lastIndexOf('\n')));
  },
};

export default logger;
