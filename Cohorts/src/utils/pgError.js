function extractPostgresError(error) {
  if (!error || error.code === undefined) return error;

  const pgErrors = {
    23505: { statusCode: 409, message: 'Resource already exists' },
    23503: { statusCode: 400, message: 'Referenced record does not exist' },
    23514: { statusCode: 400, message: 'Value violates a check constraint' },
    '22P02': { statusCode: 400, message: 'Invalid input value' },
    23502: { statusCode: 400, message: 'Missing required value' },
  };

  const mapped = pgErrors[error.code];
  if (!mapped) return error;

  const mappedError = new Error(mapped.message);
  mappedError.statusCode = mapped.statusCode;
  mappedError.isOperational = true;
  return mappedError;
}

module.exports = { extractPostgresError };