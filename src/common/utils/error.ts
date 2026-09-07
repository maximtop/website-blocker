import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';

/**
 * Minimal error shape that can be displayed to the user.
 */
type ErrorWithMessage = {
    /**
     * Human-readable explanation of the failure.
     */
    message: string
};

/**
 * Checks whether a caught value already exposes an error message.
 *
 * @param error - Value received from an operation that failed.
 * @returns Whether the value has a string message property.
 */
function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
    return (
        typeof error === 'object'
        && error !== null
        && 'message' in error
        && typeof (error as Record<string, unknown>).message === 'string'
    );
}

/**
 * Preserves an existing message or converts an arbitrary caught value to one.
 *
 * @param maybeError - Error or other thrown value to describe.
 * @returns An object containing a message suitable for display.
 */
function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
    if (isErrorWithMessage(maybeError)) {
        return maybeError;
    }

    try {
        return new Error(JSON.stringify(maybeError));
    } catch {
        return new Error(String(maybeError));
    }
}

/**
 * Formats validation failures and other caught values for the interface.
 *
 * @param error - Failure to describe to the user.
 * @returns A readable validation summary or the error's message.
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof ZodError) {
        return fromZodError(error).toString();
    }

    return toErrorWithMessage(error).message;
}
