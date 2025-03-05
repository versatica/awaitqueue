/**
 * Custom Error derived class used to reject pending tasks once stop() method
 * has been called.
 */
export class AwaitQueueStoppedError extends Error {
	constructor(message?: string) {
		super(message ?? 'queue stopped');

		this.name = 'AwaitQueueStoppedError';

		if (typeof Error.captureStackTrace === 'function') {
			Error.captureStackTrace(this, AwaitQueueStoppedError);
		}
	}
}

/**
 * Custom Error derived class used to reject pending tasks once removeTask()
 * method has been called.
 */
export class AwaitQueueRemovedTaskError extends Error {
	constructor(message?: string) {
		super(message ?? 'queue task removed');

		this.name = 'AwaitQueueRemovedTaskError';

		if (typeof Error.captureStackTrace === 'function') {
			Error.captureStackTrace(this, AwaitQueueRemovedTaskError);
		}
	}
}
