class AwaitQueue
{
	constructor({ ClosedErrorClass = Error } = {})
	{
		// Closed flag.
		// @type {Boolean}
		this._closed = false;

		// Queue of pending tasks. Each task is a function that returns a promise
		// or a value directly.
		// @type {Array<Function>}
		this._tasks = [];

		// Error used when rejecting a task after the AwaitQueue has been closed.
		// @type {Error}
		this._closedErrorClass = ClosedErrorClass;
	}

	close()
	{
		this._closed = true;
	}

	/**
	 * @param {Function} task - Function that returns a promise or a value directly.
	 *
	 * @async
	 */
	async push(task)
	{
		if (typeof task !== 'function')
			throw new TypeError('given task is not a function');

		return new Promise((resolve, reject) =>
		{
			task._resolve = resolve;
			task._reject = reject;

			// Append task to the queue.
			this._tasks.push(task);

			// And run it if the only task in the queue is the new one.
			if (this._tasks.length === 1)
				this._next();
		});
	}

	async _next()
	{
		// Take the first task.
		const task = this._tasks[0];

		if (!task)
			return;

		// Execute it.
		await this._runTask(task);

		// Remove the first task (the completed one) from the queue.
		this._tasks.shift();

		// And continue.
		this._next();
	}

	async _runTask(task)
	{
		if (this._closed)
		{
			task._reject(new this._closedErrorClass('AwaitQueue closed'));

			return;
		}

		try
		{
			const result = await task();

			if (this._closed)
			{
				task._reject(new this._closedErrorClass('AwaitQueue closed'));

				return;
			}

			// Resolve the task with the given result (if any).
			task._resolve(result);
		}
		catch (error)
		{
			if (this._closed)
			{
				task._reject(new this._closedErrorClass('AwaitQueue closed'));

				return;
			}

			// Reject the task with the error.
			task._reject(error);
		}
	}
}

module.exports = AwaitQueue;
