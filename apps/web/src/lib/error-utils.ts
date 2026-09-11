/**
 * Universal error message sanitization utility for the Web application.
 * Prevents raw database, constraint, or server stack messages from leaking to user toasts.
 */
export function getSanitizedErrorMessage(
  err: unknown,
  fallback = "Something went wrong while processing your request. Please try again."
): string {
  if (!err) return fallback;

  let message = "";
  if (typeof err === "string") {
    message = err;
  } else if (err instanceof Error) {
    message = err.message;
  } else if (typeof err === "object" && "message" in (err as Record<string, unknown>)) {
    message = String((err as Record<string, unknown>).message || "");
  }

  if (!message || message.trim() === "") {
    return fallback;
  }

  // Redact system/database errors
  const isInternalOrDbError =
    /violates.*constraint|foreign key|syntax error|relation.*does not exist|table ".*"|column ".*"|duplicate key value|pq:|Internal server error/i.test(
      message
    );

  if (isInternalOrDbError) {
    return fallback;
  }

  return message;
}
