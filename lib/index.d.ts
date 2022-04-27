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
    /**
     * Custom Error derived class that will be used to reject removed tasks after
     * removeTask() method has been called. If not set, Error class is used.
     */
    RemovedTaskErrorClass?: any;
};
export declare type AwaitQueueTask<T> = () => (Promise<T> | T);
export declare type AwaitQueueDumpItem = {
    idx: number;
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
    private readonly RemovedTaskErrorClass;
    constructor({ ClosedErrorClass, StoppedErrorClass, RemovedTaskErrorClass }?: AwaitQueueOptions);
    get size(): number;
    close(): void;
    push<T>(task: AwaitQueueTask<T>, name?: string): Promise<T>;
    removeTask(idx: number): void;
    stop(): void;
    dump(): AwaitQueueDumpItem[];
    private next;
    private executeTask;
}
//# sourceMappingURL=index.d.ts.map