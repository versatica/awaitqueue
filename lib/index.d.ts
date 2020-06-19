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
export declare type AwaitQueueTask = (...args: any[]) => any;
export declare class AwaitQueue {
    private closed;
    private readonly pendingTasks;
    private readonly ClosedErrorClass;
    private readonly StoppedErrorClass;
    constructor({ ClosedErrorClass, StoppedErrorClass }?: AwaitQueueOptions);
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
    push(task: AwaitQueueTask, name?: string): Promise<any>;
    stop(): void;
    dump(): {
        task: AwaitQueueTask;
        name?: string;
        stopped: boolean;
    }[];
    private next;
    private executeTask;
}
//# sourceMappingURL=index.d.ts.map