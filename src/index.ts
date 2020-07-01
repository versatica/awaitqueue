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
};

export type AwaitQueueTask = (...args: any[]) => any;

type PendingTask =
{
	task: AwaitQueueTask;
	name?: string;
	resolve: (...args: any[]) => any;
	reject: (error: Error) => void;
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

	constructor(
		{
			ClosedErrorClass,
			StoppedErrorClass
		}: AwaitQueueOptions =
		{
			ClosedErrorClass  : Error,
			StoppedErrorClass : Error
		}
	)
	{
		this.ClosedErrorClass = ClosedErrorClass;
		this.StoppedErrorClass = StoppedErrorClass;
	}

	/**
	 * The number of ongoing enqueued tasks.
	 */
	get size(): number
	{
		return this.pendingTasks.length;
	}

	/**
	 * Closes the AwaitQueue. Pending tasks will be rejected with ClosedErrorClass
	 * error.
	 */
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

	/**
	 * Accepts a task as argument (and an optional task name) and enqueues it after
	 * pending tasks. Once processed, the push() method resolves (or rejects) with
	 * the result returned by the given task.
	 *
	 * The given task must return a Promise or directly a value.
	 */
	async push(task: AwaitQueueTask, name?: string): Promise<any>
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
				stopped : false
			};

			// Append task to the queue.
			this.pendingTasks.push(pendingTask);

			// And run it if this is the only task in the queue.
			if (this.pendingTasks.length === 1)
				this.next();
		});
	}

	/**
	 * Make ongoing pending tasks reject with the given StoppedErrorClass error.
	 * The AwaitQueue instance is still usable for future tasks added via push()
	 * method.
	 */
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

	dump(): { task: AwaitQueueTask;	name?: string; stopped: boolean }[]
	{
		return this.pendingTasks.map((pendingTask) =>
		{
			return {
				task    : pendingTask.task,
				name    : pendingTask.name,
				stopped : pendingTask.stopped
			};
		});
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
