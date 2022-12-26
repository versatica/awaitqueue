export type AwaitQueueTask<T> = () => (T | PromiseLike<T>);

export type AwaitQueueTaskDump =
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
	enqueuedAt: number;
	executedAt?: number;
	stopped: boolean;
	resolve: (value: T | PromiseLike<T>) => void;
	reject: (error: Error) => void;
};

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
	// Queue of pending tasks.
	private readonly pendingTasks: Array<PendingTask<any>> = [];

	get size(): number
	{
		return this.pendingTasks.length;
	}

	async push<T>(task: AwaitQueueTask<T>, name?: string): Promise<T>
	{
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
				stopped    : false,
				enqueuedAt : Date.now(),
				executedAt : undefined,
				resolve,
				reject
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

	stop(): void
	{
		for (const pendingTask of this.pendingTasks)
		{
			pendingTask.stopped = true;
			pendingTask.reject(new AwaitQueueStoppedError());
		}

		// Enpty the pending tasks array.
		this.pendingTasks.length = 0;
	}

	remove(taskIdx: number): void
	{
		const pendingTask = this.pendingTasks[taskIdx];

		if (!pendingTask)
		{
			return;
		}

		this.pendingTasks.splice(taskIdx, 1);

		pendingTask.reject(new AwaitQueueRemovedTaskError());
	}

	dump(): AwaitQueueTaskDump[]
	{
		const now = Date.now();
		let idx = 0;

		return this.pendingTasks.map((pendingTask) => (
			{
				idx          : idx++,
				task         : pendingTask.task,
				name         : pendingTask.name,
				enqueuedTime : pendingTask.executedAt
					? pendingTask.executedAt - pendingTask.enqueuedAt
					: now - pendingTask.enqueuedAt,
				executingTime : pendingTask.executedAt
					? now - pendingTask.executedAt
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
		// NOTE: Ensure it remains being the same.
		if (this.pendingTasks[0] === pendingTask)
		{
			this.pendingTasks.shift();
		}

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

		pendingTask.executedAt = Date.now();

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
