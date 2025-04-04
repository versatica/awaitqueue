export type AwaitQueueTask<T> = () => T | PromiseLike<T>;

export type AwaitQueueTaskDump = {
	idx: number;
	task: AwaitQueueTask<unknown>;
	name?: string;
	enqueuedTime: number;
	executionTime: number;
};
