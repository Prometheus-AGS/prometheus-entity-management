// ignore_for_file: avoid_print

/// Typed errors that mirror TerminalError / TransientError from entity-graph-core.
///
/// 4xx-equivalent failures → [TerminalError] (do not retry).
/// 5xx / network failures  → [TransientError] (safe to retry with backoff).
library;

/// Base class for all entity-graph errors.
sealed class EntityGraphError implements Exception {
  const EntityGraphError(this.message, {this.statusCode});

  final String message;

  /// HTTP status code, if the failure was HTTP-originated.
  final int? statusCode;

  @override
  String toString() => '$runtimeType($message${statusCode != null ? ', HTTP $statusCode' : ''})';
}

/// Permanent failure — do not retry.
///
/// Equivalent to `TerminalError` in entity-graph-core.
/// Typical causes: 4xx HTTP, auth errors, schema mismatches.
final class TerminalError extends EntityGraphError {
  const TerminalError(super.message, {super.statusCode});
}

/// Temporary failure — safe to retry with back-off.
///
/// Equivalent to `TransientError` in entity-graph-core.
/// Typical causes: 5xx HTTP, network timeouts, socket drops.
final class TransientError extends EntityGraphError {
  const TransientError(super.message, {super.statusCode});
}

/// Convert an arbitrary exception to a typed [EntityGraphError].
EntityGraphError toEntityGraphError(Object error) {
  if (error is EntityGraphError) return error;

  // HTTP-status-bearing objects (e.g. Dio DioException, http.Response).
  final status = _extractStatus(error);
  if (status != null) {
    final msg = error.toString();
    if (status >= 400 && status < 500) {
      return TerminalError(msg, statusCode: status);
    }
    if (status >= 500) {
      return TransientError(msg, statusCode: status);
    }
  }

  return TransientError(error.toString());
}

int? _extractStatus(Object error) {
  // Duck-type for objects with a `statusCode` or `response.statusCode` field.
  try {
    // ignore: avoid_dynamic_calls
    final dynamic dyn = error;
    // ignore: avoid_dynamic_calls
    final code = dyn.statusCode as int?;
    return code;
  } catch (_) {
    return null;
  }
}
