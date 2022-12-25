"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwaitQueue = exports.AwaitQueueRemovedTaskError = exports.AwaitQueueStoppedError = exports.AwaitQueueClosedError = void 0;
/**
 * Custom Error derived class used to reject pending tasks once close() method
 * has been called.
 */
class AwaitQueueClosedError extends Error {
    constructor(message) {
        super(message !== null && message !== void 0 ? message : 'AwaitQueue closed');
        this.name = 'AwaitQueueClosedError';
        // @ts-ignore
        if (typeof Error.captureStackTrace === 'function') {
            // @ts-ignore
            Error.captureStackTrace(this, AwaitQueueClosedError);
        }
    }
}
exports.AwaitQueueClosedError = AwaitQueueClosedError;
/**
 * Custom Error derived class used to reject pending tasks once stop() method
 * has been called.
 */
class AwaitQueueStoppedError extends Error {
    constructor(message) {
        super(message !== null && message !== void 0 ? message : 'AwaitQueue stopped');
        this.name = 'AwaitQueueStoppedError';
        // @ts-ignore
        if (typeof Error.captureStackTrace === 'function') {
            // @ts-ignore
            Error.captureStackTrace(this, AwaitQueueStoppedError);
        }
    }
}
exports.AwaitQueueStoppedError = AwaitQueueStoppedError;
/**
 * Custom Error derived class used to reject pending tasks once removeTask()
 * method has been called.
 */
class AwaitQueueRemovedTaskError extends Error {
    constructor(message) {
        super(message !== null && message !== void 0 ? message : 'AwaitQueue task removed');
        this.name = 'AwaitQueueRemovedTaskError';
        // @ts-ignore
        if (typeof Error.captureStackTrace === 'function') {
            // @ts-ignore
            Error.captureStackTrace(this, AwaitQueueRemovedTaskError);
        }
    }
}
exports.AwaitQueueRemovedTaskError = AwaitQueueRemovedTaskError;
class AwaitQueue {
    constructor() {
        // Closed flag.
        this.closed = false;
        // Queue of pending tasks.
        this.pendingTasks = [];
    }
    get size() {
        return this.pendingTasks.length;
    }
    close() {
        if (this.closed) {
            return;
        }
        this.closed = true;
        for (const pendingTask of this.pendingTasks) {
            pendingTask.stopped = true;
            pendingTask.reject(new AwaitQueueClosedError());
        }
        // Enpty the pending tasks array.
        this.pendingTasks.length = 0;
    }
    stop() {
        if (this.closed) {
            return;
        }
        for (const pendingTask of this.pendingTasks) {
            pendingTask.stopped = true;
            pendingTask.reject(new AwaitQueueStoppedError());
        }
        // Enpty the pending tasks array.
        this.pendingTasks.length = 0;
    }
    async push(task, name) {
        if (this.closed) {
            throw new AwaitQueueClosedError();
        }
        if (typeof task !== 'function') {
            throw new TypeError('given task is not a function');
        }
        if (!task.name && name) {
            try {
                Object.defineProperty(task, 'name', { value: name });
            }
            catch (error) { }
        }
        return new Promise((resolve, reject) => {
            const pendingTask = {
                task,
                name,
                resolve,
                reject,
                stopped: false,
                enqueuedAt: new Date(),
                executedAt: undefined
            };
            // Append task to the queue.
            this.pendingTasks.push(pendingTask);
            // And run it if this is the only task in the queue.
            if (this.pendingTasks.length === 1) {
                void this.next();
            }
        });
    }
    removeTask(idx) {
        if (this.closed) {
            return;
        }
        if (idx === 0) {
            throw new TypeError('cannot remove task with index 0');
        }
        const pendingTask = this.pendingTasks[idx];
        if (!pendingTask) {
            return;
        }
        this.pendingTasks.splice(idx, 1);
        pendingTask.reject(new AwaitQueueRemovedTaskError());
    }
    dump() {
        const now = new Date();
        let idx = 0;
        return this.pendingTasks.map((pendingTask) => ({
            idx: idx++,
            task: pendingTask.task,
            name: pendingTask.name,
            enqueuedTime: pendingTask.executedAt
                ? pendingTask.executedAt.getTime() - pendingTask.enqueuedAt.getTime()
                : now.getTime() - pendingTask.enqueuedAt.getTime(),
            executingTime: pendingTask.executedAt
                ? now.getTime() - pendingTask.executedAt.getTime()
                : 0
        }));
    }
    async next() {
        // Take the first pending task.
        const pendingTask = this.pendingTasks[0];
        if (!pendingTask) {
            return;
        }
        // Execute it.
        await this.executeTask(pendingTask);
        // Remove the first pending task (the completed one) from the queue.
        this.pendingTasks.shift();
        // And continue.
        void this.next();
    }
    async executeTask(pendingTask) {
        // If the task is stopped, ignore it.
        if (pendingTask.stopped) {
            return;
        }
        pendingTask.executedAt = new Date();
        try {
            const result = await pendingTask.task();
            // If the task is stopped, ignore it.
            if (pendingTask.stopped) {
                return;
            }
            // Resolve the task with the returned result (if any).
            pendingTask.resolve(result);
        }
        catch (error) {
            // If the task is stopped, ignore it.
            if (pendingTask.stopped) {
                return;
            }
            // Reject the task with its own error.
            pendingTask.reject(error);
        }
    }
}
exports.AwaitQueue = AwaitQueue;
