import { Logger } from './Logger';
import type { AwaitQueueTask, AwaitQueueTaskDump } from './types';
import { AwaitQueueStoppedError, AwaitQueueRemovedTaskError } from './errors';

const logger = new Logger('AwaitQueue');

type PendingTask<T> = {
	id: number;
	task: AwaitQueueTask<T>;
	name?: string;
	enqueuedAt: number;
	executedAt?: number;
	completed: boolean;
	resolve: (result: T | PromiseLike<T>) => void;
	reject: (error: Error) => void;
};

export class AwaitQueue {
	// Queue of pending tasks (map of PendingTasks indexed by id).
	private readonly pendingTasks: Map<number, PendingTask<any>> = new Map();
	// Incrementing PendingTask id.
	private nextTaskId = 0;
	// Whether stop() method is stopping all pending tasks.
	private stopping = false;

	constructor() {
		logger.debug('constructor()');
	}

	get size(): number {
		return this.pendingTasks.size;
	}

	async push<T>(task: AwaitQueueTask<T>, name?: string): Promise<T> {
		name = name ?? task.name;

		logger.debug(`push() [name:${name}]`);

		if (typeof task !== 'function') {
			throw new TypeError('given task is not a function');
		}

		if (name) {
			try {
				Object.defineProperty(task, 'name', { value: name });
			} catch (error) {}
		}

		return new Promise<T>((resolve, reject) => {
			const pendingTask: PendingTask<T> = {
				id: this.nextTaskId++,
				task: task,
				name: name,
				enqueuedAt: Date.now(),
				executedAt: undefined,
				completed: false,
				resolve: (result: T | PromiseLike<T>) => {
					// pendingTask.resolve() can only be called in execute() method. Since
					// resolve() was called it means that the task successfully completed.
					// However the task may have been stopped before it completed (via
					// stop() or remove()) so its completed flag was already set. If this
					// is the case, abort here since next task (if any) is already being
					// executed.
					if (pendingTask.completed) {
						return;
					}

					pendingTask.completed = true;

					// Remove the task from the queue.
					this.pendingTasks.delete(pendingTask.id);

					logger.debug(`resolving task [name:${pendingTask.name}]`);

					// Resolve the task with the obtained result.
					resolve(result);

					// Execute the next pending task (if any).
					const [nextPendingTask] = this.pendingTasks.values();

					// NOTE: During the resolve() callback the user app may have interacted
					// with the queue. For instance, the app may have pushed a task while
					// the queue was empty so such a task is already being executed. If so,
					// don't execute it twice.
					if (nextPendingTask && !nextPendingTask.executedAt) {
						void this.execute(nextPendingTask);
					}
				},
				reject: (error: Error) => {
					// pendingTask.reject() can be called within execute() method if the
					// task completed with error. However it may have also been called in
					// stop() or remove() methods (before or while being executed) so its
					// completed flag was already set. If so, abort here since next task
					// (if any) is already being executed.
					if (pendingTask.completed) {
						return;
					}

					pendingTask.completed = true;

					// Remove the task from the queue.
					this.pendingTasks.delete(pendingTask.id);

					logger.debug(
						`rejecting task [name:${pendingTask.name}]: %s`,
						String(error)
					);

					// Reject the task with the obtained error.
					reject(error);

					// Execute the next pending task (if any) unless stop() is running.
					if (!this.stopping) {
						const [nextPendingTask] = this.pendingTasks.values();

						// NOTE: During the reject() callback the user app may have interacted
						// with the queue. For instance, the app may have pushed a task while
						// the queue was empty so such a task is already being executed. If so,
						// don't execute it twice.
						if (nextPendingTask && !nextPendingTask.executedAt) {
							void this.execute(nextPendingTask);
						}
					}
				},
			};

			// Append task to the queue.
			this.pendingTasks.set(pendingTask.id, pendingTask);

			// And execute it if this is the only task in the queue.
			if (this.pendingTasks.size === 1) {
				void this.execute(pendingTask);
			}
		});
	}

	stop(): void {
		logger.debug('stop()');

		this.stopping = true;

		for (const pendingTask of this.pendingTasks.values()) {
			logger.debug(`stop() | stopping task [name:${pendingTask.name}]`);

			pendingTask.reject(new AwaitQueueStoppedError());
		}

		this.stopping = false;
	}

	remove(taskIdx: number): void {
		logger.debug(`remove() [taskIdx:${taskIdx}]`);

		const pendingTask = Array.from(this.pendingTasks.values())[taskIdx];

		if (!pendingTask) {
			logger.debug(`stop() | no task with given idx [taskIdx:${taskIdx}]`);

			return;
		}

		pendingTask.reject(new AwaitQueueRemovedTaskError());
	}

	dump(): AwaitQueueTaskDump[] {
		const now = Date.now();
		let idx = 0;

		return Array.from(this.pendingTasks.values()).map(pendingTask => ({
			idx: idx++,
			task: pendingTask.task,
			name: pendingTask.name,
			enqueuedTime: pendingTask.executedAt
				? pendingTask.executedAt - pendingTask.enqueuedAt
				: now - pendingTask.enqueuedAt,
			executionTime: pendingTask.executedAt ? now - pendingTask.executedAt : 0,
		}));
	}

	private async execute<T>(pendingTask: PendingTask<T>): Promise<void> {
		logger.debug(`execute() [name:${pendingTask.name}]`);

		if (pendingTask.executedAt) {
			throw new Error('task already being executed');
		}

		pendingTask.executedAt = Date.now();

		try {
			const result = await pendingTask.task();

			// Resolve the task with its resolved result (if any).
			pendingTask.resolve(result);
		} catch (error) {
			// Reject the task with its rejected error.
			pendingTask.reject(error as Error);
		}
	}
}
