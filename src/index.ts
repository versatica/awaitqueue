export type AwaitQueueOptions =
{
	/**
	 * Custom Error derived class that will be used to reject pending tasks after
	 * close() method has been called. If not set, Error class is used.
	 */
	ClosedErrorClass?: any;
	/**
	 * Custom Error derived class that will be used to reject pending tasks after
	 * stop() method has been called. If not set, Error class is used.
	 */
	StoppedErrorClass?: any;
	/**
	 * Custom Error derived class that will be used to reject removed tasks after
	 * removeTask() method has been called. If not set, Error class is used.
	 */
	RemovedTaskErrorClass?: any;
};

export type AwaitQueueTask<T> = () => (Promise<T> | T);

export type AwaitQueueDumpItem =
{
	idx: number;
	task: AwaitQueueTask<unknown>;
	name?: string;
	enqueuedTime: number;
	executingTime: number;
};

type PendingTask =
{
	task: AwaitQueueTask<unknown>;
	name?: string;
	resolve: (...args: any[]) => any;
	reject: (error: Error) => void;
	enqueuedAt: Date;
	executedAt?: Date;
	stopped: boolean;
}

export class AwaitQueue
{
	// Closed flag.
	private closed = false;

	// Queue of pending tasks.
	private readonly pendingTasks: Array<PendingTask> = [];

	// Error class used when rejecting a task due to AwaitQueue being closed.
	private readonly ClosedErrorClass = Error;

	// Error class used when rejecting a task due to AwaitQueue being stopped.
	private readonly StoppedErrorClass = Error;

	// Error class used when removing a pending task when calling removeTask().
	private readonly RemovedTaskErrorClass = Error;

	constructor(
		{
			ClosedErrorClass = Error,
			StoppedErrorClass = Error,
			RemovedTaskErrorClass = Error
		}: AwaitQueueOptions =
		{
			ClosedErrorClass      : Error,
			StoppedErrorClass     : Error,
			RemovedTaskErrorClass : Error
		}
	)
	{
		this.ClosedErrorClass = ClosedErrorClass;
		this.StoppedErrorClass = StoppedErrorClass;
		this.RemovedTaskErrorClass = RemovedTaskErrorClass;
	}

	get size(): number
	{
		return this.pendingTasks.length;
	}

	close(): void
	{
		if (this.closed)
			return;

		this.closed = true;

		for (const pendingTask of this.pendingTasks)
		{
			pendingTask.stopped = true;
			pendingTask.reject(new this.ClosedErrorClass('AwaitQueue closed'));
		}

		// Enpty the pending tasks array.
		this.pendingTasks.length = 0;
	}

	async push<T>(task: AwaitQueueTask<T>, name?: string): Promise<T>
	{
		if (this.closed)
			throw new this.ClosedErrorClass('AwaitQueue closed');

		if (typeof task !== 'function')
			throw new TypeError('given task is not a function');

		if (!task.name && name)
		{
			try
			{
				Object.defineProperty(task, 'name', { value: name });
			}
			catch (error)
			{}
		}

		return new Promise((resolve, reject) =>
		{
			const pendingTask: PendingTask =
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
				this.next();
		});
	}

	removeTask(idx: number): void
	{
		if (idx === 0)
		{
			throw new TypeError('cannot remove task with index 0');
		}

		const pendingTask = this.pendingTasks[idx];

		if (!pendingTask)
			return;

		this.pendingTasks.splice(idx, 1);

		pendingTask.reject(
			new this.RemovedTaskErrorClass('task removed from the queue'));
	}

	stop(): void
	{
		if (this.closed)
			return;

		for (const pendingTask of this.pendingTasks)
		{
			pendingTask.stopped = true;
			pendingTask.reject(new this.StoppedErrorClass('AwaitQueue stopped'));
		}

		// Enpty the pending tasks array.
		this.pendingTasks.length = 0;
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

	private async next(): Promise<any>
	{
		// Take the first pending task.
		const pendingTask = this.pendingTasks[0];

		if (!pendingTask)
			return;

		// Execute it.
		await this.executeTask(pendingTask);

		// Remove the first pending task (the completed one) from the queue.
		this.pendingTasks.shift();

		// And continue.
		this.next();
	}

	private async executeTask(pendingTask: PendingTask): Promise<any>
	{
		// If the task is stopped, ignore it.
		if (pendingTask.stopped)
			return;

		pendingTask.executedAt = new Date();

		try
		{
			const result = await pendingTask.task();

			// If the task is stopped, ignore it.
			if (pendingTask.stopped)
				return;

			// Resolve the task with the returned result (if any).
			pendingTask.resolve(result);
		}
		catch (error)
		{
			// If the task is stopped, ignore it.
			if (pendingTask.stopped)
				return;

			// Reject the task with its own error.
			pendingTask.reject(error);
		}
	}
}
