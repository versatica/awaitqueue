import {
	AwaitQueue,
	AwaitQueueStoppedError,
	AwaitQueueRemovedTaskError
} from './';
import { EventEmitter } from 'node:events';

test('pushed tasks run sequentially', async () =>
{
	const awaitQueue = new AwaitQueue();
	let resultTaskA: string | Error | undefined;
	let resultTaskB: string | Error | undefined;
	let resultTaskC: string | Error | undefined;
	let resultTaskD: string | Error | undefined;
	let resultTaskE: string | Error | undefined;
	let resultTaskF: string | Error | undefined;
	const resolvedResults: string[] = [];

	const taskA = async (): Promise<string> =>
	{
		resolvedResults.push('A1');
		await wait(50);
		resolvedResults.push('A2');

		// Note that taskB was already removed when taskA started being processed.
		expectDumpToContain(awaitQueue, [ 'taskA', 'taskC', 'taskD', 'taskE', 'taskF' ]);

		return 'taskA';
	};

	const taskB = async (): Promise<string> =>
	{
		resolvedResults.push('B1');
		await wait(50);
		resolvedResults.push('B2');

		return 'taskB';
	};

	const taskC = (): string =>
	{
		resolvedResults.push('C1');
		resolvedResults.push('C2');

		expectDumpToContain(awaitQueue, [ 'taskC', 'taskD', 'taskE', 'taskF' ]);

		return 'taskC';
	};

	const taskD = async (): Promise<string> =>
	{
		resolvedResults.push('D1');
		await wait(50);
		resolvedResults.push('D2');

		expectDumpToContain(awaitQueue, [ 'taskD', 'taskE', 'taskF' ]);

		// Remove taskD so it must reject with AwaitQueueRemovedTaskError.
		awaitQueue.remove(0);

		expectDumpToContain(awaitQueue, [ 'taskE', 'taskF' ]);

		return 'taskD';
	};

	const taskE = async (): Promise<string> =>
	{
		resolvedResults.push('E1');
		await wait(50);
		resolvedResults.push('E2');

		expectDumpToContain(awaitQueue, [ 'taskE', 'taskF' ]);

		// Make taskE and taskF reject with AwaitQueueStoppedError.
		awaitQueue.stop();

		expectDumpToContain(awaitQueue, []);

		return 'taskD';
	};

	const taskF = async (): Promise<string> =>
	{
		resolvedResults.push('F1');
		await wait(50);
		resolvedResults.push('F2');

		return 'taskF';
	};

	// Create a Promise that will resolve once last taskE completes.
	const tasksPromise = new Promise<void>((resolve) =>
	{
		awaitQueue.push(taskA, 'taskA')
			.then((result) => { resultTaskA = result; })
			.catch((error) => { resultTaskA = error; });

		awaitQueue.push(taskB, 'taskB')
			.then((result) => { resultTaskB = result; })
			.catch((error) => { resultTaskB = error; });

		awaitQueue.push(taskC, 'taskC')
			.then((result) => { resultTaskC = result; })
			.catch((error) => { resultTaskC = error; });

		awaitQueue.push(taskD, 'taskD')
			.then((result) => { resultTaskD = result; })
			.catch((error) => { resultTaskD = error; });

		awaitQueue.push(taskE, 'taskE')
			.then((result) => { resultTaskE = result; })
			.catch((error) => { resultTaskE = error; });

		awaitQueue.push(taskF, 'taskF')
			.then((result) => { resultTaskF = result; })
			.catch((error) => { resultTaskF = error; resolve(); });
	});

	expectDumpToContain(awaitQueue, [ 'taskA', 'taskB', 'taskC', 'taskD', 'taskE', 'taskF' ]);

	// Remove taskB so it must reject with AwaitQueueRemovedTaskError.
	awaitQueue.remove(1);

	expectDumpToContain(awaitQueue, [ 'taskA', 'taskC', 'taskD', 'taskE', 'taskF' ]);

	// Wait for all tasks to complete.
	await tasksPromise;

	expect(resultTaskA).toBe('taskA');
	expect(resultTaskB instanceof AwaitQueueRemovedTaskError).toBe(true);
	expect(resultTaskC).toBe('taskC');
	expect(resultTaskD instanceof AwaitQueueRemovedTaskError).toBe(true);
	expect(resultTaskE instanceof AwaitQueueStoppedError).toBe(true);
	expect(resultTaskF instanceof AwaitQueueStoppedError).toBe(true);
	expect(resolvedResults).toEqual([ 'A1', 'A2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2' ]);
}, 1000);

test('new task does not lead to next task execution if a (stopped) one is ongoing', async () =>
{
	const awaitQueue = new AwaitQueue();
	const executionsCount: Map<string, number> = new Map();
	const emitter = new EventEmitter();

	const taskA = function()
	{
		const taskName = 'taskA';

		return new Promise((resolve) =>
		{
			let executionCount = executionsCount.get(taskName) || 0;

			executionsCount.set(taskName, ++executionCount);

			emitter.on('resolve-task-a', resolve);
		});
	};

	const taskB = function()
	{
		const taskName = 'taskB';

		return new Promise((resolve) =>
		{
			let executionCount = executionsCount.get(taskName) || 0;

			executionsCount.set(taskName, ++executionCount);

			resolve(true);
		});
	};

	// Add task A into the AwaitQueue. Ignore the stop error.
	awaitQueue.push(taskA).catch(() => {});
	// Stop the queue.
	awaitQueue.stop();
	// Add a task B into the AwaitQueue.
	awaitQueue.push(taskB);
	// Task A is still running, terminate it.
	emitter.emit('resolve-task-a');

	await wait(0);

	expect(executionsCount.get('taskA')).toBe(1);
	expect(executionsCount.get('taskB')).toBe(1);
}, 1000);

async function wait(timeMs: number): Promise<void>
{
	await new Promise<void>((resolve) =>
	{
		setTimeout(resolve, timeMs);
	});
}

function expectDumpToContain(awaitQueue: AwaitQueue, taskNames: string[]): void
{
	const dump = awaitQueue.dump();

	expect(awaitQueue.size).toBe(taskNames.length);
	expect(dump.length).toBe(taskNames.length);

	for (let i = 0; i < taskNames.length; ++i)
	{
		expect(dump[i]).toMatchObject(
			{
				idx  : i,
				name : taskNames[i]
			});
	}
}
