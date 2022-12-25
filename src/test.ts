import {
	AwaitQueue,
	AwaitQueueClosedError,
	AwaitQueueRemovedTaskError
} from '.';

test('pushed tasks run sequentially', async () =>
{
	const awaitQueue = new AwaitQueue();
	let resultTaskA: string | undefined;
	let resultTaskB: AwaitQueueRemovedTaskError | undefined;
	let resultTaskC: string | undefined;
	let resultTaskD: AwaitQueueClosedError | undefined;
	let resultTaskE: AwaitQueueClosedError | undefined;
	const strings: string[] = [];

	const taskA = async (): Promise<string> =>
	{
		strings.push('A1');
		await wait(10);
		strings.push('A2');

		return 'taskA';
	};

	const taskB = async (): Promise<string> =>
	{
		strings.push('B1');
		await wait(10);
		strings.push('B2');

		return 'taskB';
	};

	const taskC = async (): Promise<string> =>
	{
		strings.push('C1');
		await wait(10);
		strings.push('C2');

		return 'taskC';
	};

	const taskD = async (): Promise<string> =>
	{
		strings.push('D1');
		await wait(10);
		strings.push('D2');

		// Make taskD and taskE reject with AwaitQueueClosedError.
		awaitQueue.close();

		return 'taskD';
	};

	const taskE = async (): Promise<string> =>
	{
		strings.push('E1');
		await wait(10);
		strings.push('E2');

		return 'taskE';
	};

	awaitQueue.push(taskA, 'taskA').then((result) => { resultTaskA = result; });
	awaitQueue.push(taskB, 'taskB').catch((error) => { resultTaskB = error; });
	awaitQueue.push(taskC, 'taskC').then((result) => { resultTaskC = result; });
	awaitQueue.push(taskD, 'taskD').catch((error) => { resultTaskD = error; });
	awaitQueue.push(taskE, 'taskE').catch((error) => { resultTaskE = error; });

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
	awaitQueue.removeTask(1);

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

	// Give enough time for all tasks to complete.
	await wait(200);

	expect(strings).toEqual([ 'A1', 'A2', 'C1', 'C2', 'D1', 'D2' ]);
	expect(resultTaskA).toBe('taskA');
	expect(resultTaskB instanceof AwaitQueueRemovedTaskError).toBe(true);
	expect(resultTaskC).toBe('taskC');
	expect(resultTaskD instanceof AwaitQueueClosedError).toBe(true);
	expect(resultTaskE instanceof AwaitQueueClosedError).toBe(true);
}, 5000);

async function wait(timeMs: number): Promise<void>
{
	await new Promise<void>((resolve) =>
	{
		setTimeout(resolve, timeMs);
	});
}
