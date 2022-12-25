export type AwaitQueueTask<T> = () => (Promise<T> | T);

export type AwaitQueueDumpItem =
{
	idx: number;
	task: AwaitQueueTask<unknown>;
	name?: string;
	enqueuedTime: number;
	executingTime: number;
};

type PendingTask<T> =
{
	task: AwaitQueueTask<T>;
	name?: string;
	resolve: (value: T | PromiseLike<T>) => void;
	reject: (error: Error) => void;
	enqueuedAt: Date;
	executedAt?: Date;
	stopped: boolean;
};

/**
 * Custom Error derived class used to reject pending tasks once close() method
 * has been called.
 */
export class AwaitQueueClosedError extends Error
{
	constructor(message?: string)
	{
		super(message ?? 'AwaitQueue closed');

		this.name = 'AwaitQueueClosedError';

		// @ts-ignore
		if (typeof Error.captureStackTrace === 'function')
		{
			// @ts-ignore
			Error.captureStackTrace(this, AwaitQueueClosedError);
		}
	}
}

/**
 * Custom Error derived class used to reject pending tasks once stop() method
 * has been called.
 */
export class AwaitQueueStoppedError extends Error
{
	constructor(message?: string)
	{
		super(message ?? 'AwaitQueue stopped');

		this.name = 'AwaitQueueStoppedError';

		// @ts-ignore
		if (typeof Error.captureStackTrace === 'function')
		{
			// @ts-ignore
			Error.captureStackTrace(this, AwaitQueueStoppedError);
		}
	}
}

/**
 * Custom Error derived class used to reject pending tasks once removeTask()
 * method has been called.
 */
export class AwaitQueueRemovedTaskError extends Error
{
	constructor(message?: string)
	{
		super(message ?? 'AwaitQueue task removed');

		this.name = 'AwaitQueueRemovedTaskError';

		// @ts-ignore
		if (typeof Error.captureStackTrace === 'function')
		{
			// @ts-ignore
			Error.captureStackTrace(this, AwaitQueueRemovedTaskError);
		}
	}
}

export class AwaitQueue
{
	// Closed flag.
	private closed = false;

	// Queue of pending tasks.
	private readonly pendingTasks: Array<PendingTask<any>> = [];

	get size(): number
	{
		return this.pendingTasks.length;
	}

	close(): void
	{
		if (this.closed)
		{
			return;
		}

		this.closed = true;

		for (const pendingTask of this.pendingTasks)
		{
			pendingTask.stopped = true;
			pendingTask.reject(new AwaitQueueClosedError());
		}

		// Enpty the pending tasks array.
		this.pendingTasks.length = 0;
	}

	stop(): void
	{
		if (this.closed)
		{
			return;
		}

		for (const pendingTask of this.pendingTasks)
		{
			pendingTask.stopped = true;
			pendingTask.reject(new AwaitQueueStoppedError());
		}

		// Enpty the pending tasks array.
		this.pendingTasks.length = 0;
	}

	async push<T>(task: AwaitQueueTask<T>, name?: string): Promise<T>
	{
		if (this.closed)
		{
			throw new AwaitQueueClosedError();
		}

		if (typeof task !== 'function')
		{
			throw new TypeError('given task is not a function');
		}

		if (!task.name && name)
		{
			try
			{
				Object.defineProperty(task, 'name', { value: name });
			}
			catch (error)
			{}
		}

		return new Promise<T>((resolve, reject) =>
		{
			const pendingTask: PendingTask<T> =
			{
				task,
				name,
				resolve,
				reject,
				stopped    : false,
				enqueuedAt : new Date(),
				executedAt : undefined
			};

			// Append task to the queue.
			this.pendingTasks.push(pendingTask);

			// And run it if this is the only task in the queue.
			if (this.pendingTasks.length === 1)
			{
				void this.next();
			}
		});
	}

	removeTask(idx: number): void
	{
		if (this.closed)
		{
			return;
		}

		if (idx === 0)
		{
			throw new TypeError('cannot remove task with index 0');
		}

		const pendingTask = this.pendingTasks[idx];

		if (!pendingTask)
		{
			return;
		}

		this.pendingTasks.splice(idx, 1);

		pendingTask.reject(new AwaitQueueRemovedTaskError());
	}

	dump(): AwaitQueueDumpItem[]
	{
		const now = new Date();
		let idx = 0;

		return this.pendingTasks.map((pendingTask) => (
			{
				idx          : idx++,
				task         : pendingTask.task,
				name         : pendingTask.name,
				enqueuedTime : pendingTask.executedAt
					? pendingTask.executedAt.getTime() - pendingTask.enqueuedAt.getTime()
					: now.getTime() - pendingTask.enqueuedAt.getTime(),
				executingTime : pendingTask.executedAt
					? now.getTime() - pendingTask.executedAt.getTime()
					: 0
			}
		));
	}

	private async next(): Promise<void>
	{
		// Take the first pending task.
		const pendingTask = this.pendingTasks[0];

		if (!pendingTask)
		{
			return;
		}

		// Execute it.
		await this.executeTask(pendingTask);

		// Remove the first pending task (the completed one) from the queue.
		this.pendingTasks.shift();

		// And continue.
		void this.next();
	}

	private async executeTask<T>(pendingTask: PendingTask<T>): Promise<void>
	{
		// If the task is stopped, ignore it.
		if (pendingTask.stopped)
		{
			return;
		}

		pendingTask.executedAt = new Date();

		try
		{
			const result = await pendingTask.task();

			// If the task is stopped, ignore it.
			if (pendingTask.stopped)
			{
				return;
			}

			// Resolve the task with the returned result (if any).
			pendingTask.resolve(result);
		}
		catch (error)
		{
			// If the task is stopped, ignore it.
			if (pendingTask.stopped)
			{
				return;
			}

			// Reject the task with its own error.
			pendingTask.reject(error as Error);
		}
	}
}
