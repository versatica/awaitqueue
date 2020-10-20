export declare type AwaitQueueOptions = {
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
export declare type AwaitQueueTask<T> = () => (Promise<T> | T);
export declare type AwaitQueueDumpItem = {
    task: AwaitQueueTask<unknown>;
    name?: string;
    enqueuedTime: number;
    executingTime: number;
};
export declare class AwaitQueue {
    private closed;
    private readonly pendingTasks;
    private readonly ClosedErrorClass;
    private readonly StoppedErrorClass;
    constructor({ ClosedErrorClass, StoppedErrorClass }?: AwaitQueueOptions);
    /**
     * The number of ongoing enqueued tasks.
     */
    get size(): number;
    /**
     * Closes the AwaitQueue. Pending tasks will be rejected with ClosedErrorClass
     * error.
     */
    close(): void;
    /**
     * Accepts a task as argument (and an optional task name) and enqueues it after
     * pending tasks. Once processed, the push() method resolves (or rejects) with
     * the result returned by the given task.
     *
     * The given task must return a Promise or directly a value.
     */
    push<T>(task: AwaitQueueTask<T>, name?: string): Promise<T>;
    /**
     * Make ongoing pending tasks reject with the given StoppedErrorClass error.
     * The AwaitQueue instance is still usable for future tasks added via push()
     * method.
     */
    stop(): void;
    dump(): AwaitQueueDumpItem[];
    private next;
    private executeTask;
}
//# sourceMappingURL=index.d.ts.map