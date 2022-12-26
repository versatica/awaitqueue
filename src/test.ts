import {
	AwaitQueue,
	AwaitQueueStoppedError,
	AwaitQueueRemovedTaskError
} from '.';

test('pushed tasks run sequentially', async () =>
{
	const awaitQueue = new AwaitQueue();
	let resultTaskA: string | undefined;
	let resultTaskB: AwaitQueueRemovedTaskError | undefined;
	let resultTaskC: string | undefined;
	let resultTaskD: AwaitQueueStoppedError | undefined;
	let resultTaskE: AwaitQueueStoppedError | undefined;
	const strings: string[] = [];

	const taskA = async (): Promise<string> =>
	{
		strings.push('A1');
		await wait(50);
		strings.push('A2');

		return 'taskA';
	};

	const taskB = async (): Promise<string> =>
	{
		strings.push('B1');
		await wait(50);
		strings.push('B2');

		return 'taskB';
	};

	const taskC = (): string =>
	{
		strings.push('C1');
		strings.push('C2');

		return 'taskC';
	};

	const taskD = async (): Promise<string> =>
	{
		strings.push('D1');
		await wait(50);
		strings.push('D2');

		// Make taskD and taskE reject with AwaitQueueStoppedError.
		awaitQueue.stop();

		return 'taskD';
	};

	const taskE = async (): Promise<string> =>
	{
		strings.push('E1');
		await wait(50);
		strings.push('E2');

		return 'taskE';
	};

	// Create a Promise that will resolve once last taskE completes.
	const tasksPromise = new Promise<void>((resolve) =>
	{
		awaitQueue.push(taskA, 'taskA').then((result) => { resultTaskA = result; });
		awaitQueue.push(taskB, 'taskB').catch((error) => { resultTaskB = error; });
		awaitQueue.push(taskC, 'taskC').then((result) => { resultTaskC = result; });
		awaitQueue.push(taskD, 'taskD').catch((error) => { resultTaskD = error; });
		awaitQueue.push(taskE, 'taskE').catch((error) => { resultTaskE = error; resolve(); });
	});

	expect(awaitQueue.size).toBe(5);

	const dump1 = awaitQueue.dump();

	expect(dump1.length).toBe(5);
	expect(dump1[0]).toMatchObject(
		{
			idx  : 0,
			name : 'taskA'
		});
	expect(dump1[1]).toMatchObject(
		{
			idx  : 1,
			name : 'taskB'
		});
	expect(dump1[2]).toMatchObject(
		{
			idx  : 2,
			name : 'taskC'
		});
	expect(dump1[3]).toMatchObject(
		{
			idx  : 3,
			name : 'taskD'
		});
	expect(dump1[4]).toMatchObject(
		{
			idx  : 4,
			name : 'taskE'
		});

	// Remove taskB.
	awaitQueue.remove(1);

	expect(awaitQueue.size).toBe(4);

	const dump2 = awaitQueue.dump();

	expect(dump2.length).toBe(4);
	expect(dump2[0]).toMatchObject(
		{
			idx  : 0,
			name : 'taskA'
		});
	expect(dump2[1]).toMatchObject(
		{
			idx  : 1,
			name : 'taskC'
		});
	expect(dump2[2]).toMatchObject(
		{
			idx  : 2,
			name : 'taskD'
		});
	expect(dump2[3]).toMatchObject(
		{
			idx  : 3,
			name : 'taskE'
		});

	// Wait for all tasks to complete.
	await tasksPromise;

	expect(strings).toEqual([ 'A1', 'A2', 'C1', 'C2', 'D1', 'D2' ]);
	expect(resultTaskA).toBe('taskA');
	expect(resultTaskB instanceof AwaitQueueRemovedTaskError).toBe(true);
	expect(resultTaskC).toBe('taskC');
	expect(resultTaskD instanceof AwaitQueueStoppedError).toBe(true);
	expect(resultTaskE instanceof AwaitQueueStoppedError).toBe(true);
}, 5000);

async function wait(timeMs: number): Promise<void>
{
	await new Promise<void>((resolve) =>
	{
		setTimeout(resolve, timeMs);
	});
}
