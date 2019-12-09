export interface AwaitQueueOptions
{
	/**
	 * Custom Error derived class that will be used to reject pending tasks after
	 * close() method has been called. If not set, Error class is used.
	 */
	ClosedErrorClass?: any;
}

interface PendingTask
{
	execute: Function;
	resolve: Function;
	reject: Function;
}

class AwaitQueue
{
	// Closed flag.
	private _closed = false;

	// Queue of pending tasks.
	private readonly _pendingTasks: Array<PendingTask> = [];

	// Error class used when rejecting a task due to AwaitQueue being closed.
	private readonly _ClosedErrorClass = Error;

	constructor(
		{ ClosedErrorClass }: AwaitQueueOptions =
		{ ClosedErrorClass: Error }
	)
	{
		this._ClosedErrorClass = ClosedErrorClass;
	}

	/**
	 * Closes the AwaitQueue. Pending tasks will be rejected with ClosedErrorClass
	 * error.
	 */
	close(): void
	{
		this._closed = true;
	}

	/**
	 * Accepts a task as argument and enqueues it after pending tasks. Once
	 * processed, the push() method resolves (or rejects) with the result
	 * returned by the given task.
	 *
	 * The given task must return a Promise or directly a value.
	 */
	async push(task: Function): Promise<any>
	{
		if (typeof task !== 'function')
			throw new TypeError('given task is not a function');

		return new Promise((resolve, reject) =>
		{
			const pendingTask: PendingTask =
			{
				execute : task,
				resolve,
				reject
			};

			// Append task to the queue.
			this._pendingTasks.push(pendingTask);

			// And run it if this is the only task in the queue.
			if (this._pendingTasks.length === 1)
				this._next();
		});
	}

	private async _next(): Promise<any>
	{
		// Take the first pending task.
		const pendingTask = this._pendingTasks[0];

		if (!pendingTask)
			return;

		// Execute it.
		await this._executeTask(pendingTask);

		// Remove the first pending task (the completed one) from the queue.
		this._pendingTasks.shift();

		// And continue.
		this._next();
	}

	private async _executeTask(pendingTask: PendingTask): Promise<any>
	{
		if (this._closed)
		{
			pendingTask.reject(new this._ClosedErrorClass('AwaitQueue closed'));

			return;
		}

		try
		{
			const result = await pendingTask.execute();

			if (this._closed)
			{
				pendingTask.reject(new this._ClosedErrorClass('AwaitQueue closed'));

				return;
			}

			// Resolve the task with the returned result (if any).
			pendingTask.resolve(result);
		}
		catch (error)
		{
			if (this._closed)
			{
				pendingTask.reject(new this._ClosedErrorClass('AwaitQueue closed'));

				return;
			}

			// Reject the task with its own error.
			pendingTask.reject(error);
		}
	}
}

export { AwaitQueue };
