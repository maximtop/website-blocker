import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';

type ErrorWithMessage = {
    message: string
};

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
    return (
        typeof error === 'object'
        && error !== null
        && 'message' in error
        && typeof (error as Record<string, unknown>).message === 'string'
    );
}

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

export function getErrorMessage(error: unknown): string {
    if (error instanceof ZodError) {
        return fromZodError(error).toString();
    }

    return toErrorWithMessage(error).message;
}
