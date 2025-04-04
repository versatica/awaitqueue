import { EventEmitter } from 'node:events';
import {
	AwaitQueue,
	AwaitQueueStoppedError,
	AwaitQueueRemovedTaskError,
} from '../';

test('tasks run sequentially', async () => {
	const awaitQueue = new AwaitQueue();
	let resultTaskA: string | Error | undefined;
	let resultTaskB: string | Error | undefined;
	let resultTaskC: string | Error | undefined;
	let resultTaskD: string | Error | undefined;
	let resultTaskE: string | Error | undefined;
	let resultTaskF: string | Error | undefined;
	const resolvedResults: string[] = [];

	const taskA = async (): Promise<string> => {
		resolvedResults.push('A1');
		await wait(50);
		resolvedResults.push('A2');

		// Note that taskB was already removed when taskA started being processed.
		expectDumpToContain(awaitQueue, [
			'taskA',
			'taskC',
			'taskD',
			'taskE',
			'taskF',
		]);

		return 'taskA';
	};

	const taskB = async (): Promise<string> => {
		resolvedResults.push('B1');
		await wait(50);
		resolvedResults.push('B2');

		return 'taskB';
	};

	const taskC = (): string => {
		resolvedResults.push('C1');
		resolvedResults.push('C2');

		expectDumpToContain(awaitQueue, ['taskC', 'taskD', 'taskE', 'taskF']);

		return 'taskC';
	};

	const taskD = async (): Promise<string> => {
		resolvedResults.push('D1');
		await wait(50);
		resolvedResults.push('D2');

		expectDumpToContain(awaitQueue, ['taskD', 'taskE', 'taskF']);

		// Remove taskD so it must reject with AwaitQueueRemovedTaskError.
		awaitQueue.remove(0);

		expectDumpToContain(awaitQueue, ['taskE', 'taskF']);

		return 'taskD';
	};

	const taskE = async (): Promise<string> => {
		resolvedResults.push('E1');
		await wait(50);
		resolvedResults.push('E2');

		expectDumpToContain(awaitQueue, ['taskE', 'taskF']);

		// Make taskE and taskF reject with AwaitQueueStoppedError.
		awaitQueue.stop();

		expectDumpToContain(awaitQueue, []);

		return 'taskD';
	};

	const taskF = async (): Promise<string> => {
		resolvedResults.push('F1');
		await wait(50);
		resolvedResults.push('F2');

		return 'taskF';
	};

	// Create a Promise that will resolve once last taskE completes.
	const tasksPromise: Promise<void> = new Promise(resolve => {
		awaitQueue
			.push(taskA, 'taskA')
			.then(result => {
				resultTaskA = result;
			})
			.catch((error: Error) => {
				resultTaskA = error;
			});

		awaitQueue
			.push(taskB, 'taskB')
			.then(result => {
				resultTaskB = result;
			})
			.catch((error: Error) => {
				resultTaskB = error;
			});

		awaitQueue
			.push(taskC, 'taskC')
			.then(result => {
				resultTaskC = result;
			})
			.catch((error: Error) => {
				resultTaskC = error;
			});

		awaitQueue
			.push(taskD, 'taskD')
			.then(result => {
				resultTaskD = result;
			})
			.catch((error: Error) => {
				resultTaskD = error;
			});

		awaitQueue
			.push(taskE, 'taskE')
			.then(result => {
				resultTaskE = result;
			})
			.catch((error: Error) => {
				resultTaskE = error;
			});

		awaitQueue
			.push(taskF, 'taskF')
			.then(result => {
				resultTaskF = result;
			})
			.catch((error: Error) => {
				resultTaskF = error;
				resolve();
			});
	});

	expectDumpToContain(awaitQueue, [
		'taskA',
		'taskB',
		'taskC',
		'taskD',
		'taskE',
		'taskF',
	]);

	// Remove taskB so it must reject with AwaitQueueRemovedTaskError.
	awaitQueue.remove(1);

	expectDumpToContain(awaitQueue, [
		'taskA',
		'taskC',
		'taskD',
		'taskE',
		'taskF',
	]);

	// Wait for all tasks to complete.
	await tasksPromise;

	expect(resultTaskA).toBe('taskA');
	expect(resultTaskB instanceof AwaitQueueRemovedTaskError).toBe(true);
	expect(resultTaskC).toBe('taskC');
	expect(resultTaskD instanceof AwaitQueueRemovedTaskError).toBe(true);
	expect(resultTaskE instanceof AwaitQueueStoppedError).toBe(true);
	expect(resultTaskF instanceof AwaitQueueStoppedError).toBe(true);
	expect(resolvedResults).toEqual([
		'A1',
		'A2',
		'C1',
		'C2',
		'D1',
		'D2',
		'E1',
		'E2',
	]);
}, 1000);

test('new task does not lead to next task execution if a stopped one is ongoing', async () => {
	const awaitQueue = new AwaitQueue();
	const executionsCount: Map<string, number> = new Map();
	const emitter = new EventEmitter();

	const taskA = function (): Promise<void> {
		const taskName = 'taskA';

		return new Promise<void>(resolve => {
			let executionCount = executionsCount.get(taskName) ?? 0;

			executionsCount.set(taskName, ++executionCount);

			emitter.on('resolve-task-a', resolve);
		});
	};

	const taskB = function (): Promise<void> {
		const taskName = 'taskB';

		return new Promise<void>(resolve => {
			let executionCount = executionsCount.get(taskName) ?? 0;

			executionsCount.set(taskName, ++executionCount);

			emitter.on('resolve-task-b', resolve);
		});
	};

	const taskC = function (): Promise<void> {
		const taskName = 'taskC';

		return new Promise<void>(resolve => {
			let executionCount = executionsCount.get(taskName) ?? 0;

			executionsCount.set(taskName, ++executionCount);

			emitter.on('resolve-task-c', resolve);
		});
	};

	const taskD = function (): Promise<void> {
		const taskName = 'taskD';

		return new Promise<void>(resolve => {
			let executionCount = executionsCount.get(taskName) ?? 0;

			executionsCount.set(taskName, ++executionCount);

			emitter.on('resolve-task-d', resolve);
		});
	};

	// Add task A into the AwaitQueue. Ignore the stop error and push task D during
	// the rejection.
	awaitQueue.push(taskA, 'taskA').catch(() => awaitQueue.push(taskD, 'taskD'));

	// Add a task B into the AwaitQueue. Ignore stop error.
	awaitQueue.push(taskB, 'taskB').catch(() => {});

	// Stop the queue. This will make tasks A and B reject and task D will be pushed.
	awaitQueue.stop();

	// Add a task C into the AwaitQueue.
	void awaitQueue.push(taskC, 'taskC');

	// Task A is still running (despite it was stopped), terminate it.
	emitter.emit('resolve-task-a');

	// Task A was stopped while running.
	expect(executionsCount.get('taskA')).toBe(1);
	// Task B was stopped before running.
	expect(executionsCount.get('taskB')).toBe(undefined);
	// Task C was executed entirely.
	expect(executionsCount.get('taskC')).toBe(1);

	// Terminate tasks B and C (despite B was stopped).
	emitter.emit('resolve-task-b');
	emitter.emit('resolve-task-c');

	// Needed to wait for the execution of task D (otherwise the emit() call below
	// would happen before the listener is set.
	await wait(0);

	// Terminate task D.
	emitter.emit('resolve-task-d');

	// Task D has resolved.
	expect(executionsCount.get('taskD')).toBe(1);
}, 1000);

async function wait(timeMs: number): Promise<void> {
	await new Promise<void>(resolve => {
		setTimeout(resolve, timeMs);
	});
}

function expectDumpToContain(
	awaitQueue: AwaitQueue,
	taskNames: string[]
): void {
	const dump = awaitQueue.dump();

	expect(awaitQueue.size).toBe(taskNames.length);
	expect(dump.length).toBe(taskNames.length);

	for (let i = 0; i < taskNames.length; ++i) {
		expect(dump[i]).toMatchObject({
			idx: i,
			name: taskNames[i],
		});
	}
}
