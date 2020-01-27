export interface AwaitQueueOptions {
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
}
declare class AwaitQueue {
    private _closed;
    private readonly _pendingTasks;
    private readonly _ClosedErrorClass;
    private readonly _StoppedErrorClass;
    constructor({ ClosedErrorClass, StoppedErrorClass }?: AwaitQueueOptions);
    /**
     * Closes the AwaitQueue. Pending tasks will be rejected with ClosedErrorClass
     * error.
     */
    close(): void;
    /**
     * Accepts a task as argument and enqueues it after pending tasks. Once
     * processed, the push() method resolves (or rejects) with the result
     * returned by the given task.
     *
     * The given task must return a Promise or directly a value.
     */
    push(task: Function): Promise<any>;
    stop(): void;
    private _next;
    private _executeTask;
}
export { AwaitQueue };
//# sourceMappingURL=index.d.ts.map