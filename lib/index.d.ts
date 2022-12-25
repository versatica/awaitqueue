export type AwaitQueueTask<T> = () => (Promise<T> | T);
export type AwaitQueueDumpItem = {
    idx: number;
    task: AwaitQueueTask<unknown>;
    name?: string;
    enqueuedTime: number;
    executingTime: number;
};
/**
 * Custom Error derived class used to reject pending tasks once close() method
 * has been called.
 */
export declare class AwaitQueueClosedError extends Error {
    constructor(message?: string);
}
/**
 * Custom Error derived class used to reject pending tasks once stop() method
 * has been called.
 */
export declare class AwaitQueueStoppedError extends Error {
    constructor(message?: string);
}
/**
 * Custom Error derived class used to reject pending tasks once removeTask()
 * method has been called.
 */
export declare class AwaitQueueRemovedTaskError extends Error {
    constructor(message?: string);
}
export declare class AwaitQueue {
    private closed;
    private readonly pendingTasks;
    get size(): number;
    close(): void;
    stop(): void;
    push<T>(task: AwaitQueueTask<T>, name?: string): Promise<T>;
    removeTask(idx: number): void;
    dump(): AwaitQueueDumpItem[];
    private next;
    private executeTask;
}
//# sourceMappingURL=index.d.ts.map