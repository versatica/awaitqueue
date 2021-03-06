"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
class AwaitQueue {
    constructor({ ClosedErrorClass = Error, StoppedErrorClass = Error } = {
        ClosedErrorClass: Error,
        StoppedErrorClass: Error
    }) {
        // Closed flag.
        this.closed = false;
        // Queue of pending tasks.
        this.pendingTasks = [];
        // Error class used when rejecting a task due to AwaitQueue being closed.
        this.ClosedErrorClass = Error;
        // Error class used when rejecting a task due to AwaitQueue being stopped.
        this.StoppedErrorClass = Error;
        this.ClosedErrorClass = ClosedErrorClass;
        this.StoppedErrorClass = StoppedErrorClass;
    }
    /**
     * The number of ongoing enqueued tasks.
     */
    get size() {
        return this.pendingTasks.length;
    }
    /**
     * Closes the AwaitQueue. Pending tasks will be rejected with ClosedErrorClass
     * error.
     */
    close() {
        if (this.closed)
            return;
        this.closed = true;
        for (const pendingTask of this.pendingTasks) {
            pendingTask.stopped = true;
            pendingTask.reject(new this.ClosedErrorClass('AwaitQueue closed'));
        }
        // Enpty the pending tasks array.
        this.pendingTasks.length = 0;
    }
    /**
     * Accepts a task as argument (and an optional task name) and enqueues it after
     * pending tasks. Once processed, the push() method resolves (or rejects) with
     * the result returned by the given task.
     *
     * The given task must return a Promise or directly a value.
     */
    push(task, name) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.closed)
                throw new this.ClosedErrorClass('AwaitQueue closed');
            if (typeof task !== 'function')
                throw new TypeError('given task is not a function');
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
                if (this.pendingTasks.length === 1)
                    this.next();
            });
        });
    }
    /**
     * Make ongoing pending tasks reject with the given StoppedErrorClass error.
     * The AwaitQueue instance is still usable for future tasks added via push()
     * method.
     */
    stop() {
        if (this.closed)
            return;
        for (const pendingTask of this.pendingTasks) {
            pendingTask.stopped = true;
            pendingTask.reject(new this.StoppedErrorClass('AwaitQueue stopped'));
        }
        // Enpty the pending tasks array.
        this.pendingTasks.length = 0;
    }
    dump() {
        const now = new Date();
        return this.pendingTasks.map((pendingTask) => {
            return {
                task: pendingTask.task,
                name: pendingTask.name,
                enqueuedTime: pendingTask.executedAt
                    ? pendingTask.executedAt.getTime() - pendingTask.enqueuedAt.getTime()
                    : now.getTime() - pendingTask.enqueuedAt.getTime(),
                executingTime: pendingTask.executedAt
                    ? now.getTime() - pendingTask.executedAt.getTime()
                    : 0
            };
        });
    }
    next() {
        return __awaiter(this, void 0, void 0, function* () {
            // Take the first pending task.
            const pendingTask = this.pendingTasks[0];
            if (!pendingTask)
                return;
            // Execute it.
            yield this.executeTask(pendingTask);
            // Remove the first pending task (the completed one) from the queue.
            this.pendingTasks.shift();
            // And continue.
            this.next();
        });
    }
    executeTask(pendingTask) {
        return __awaiter(this, void 0, void 0, function* () {
            // If the task is stopped, ignore it.
            if (pendingTask.stopped)
                return;
            pendingTask.executedAt = new Date();
            try {
                const result = yield pendingTask.task();
                // If the task is stopped, ignore it.
                if (pendingTask.stopped)
                    return;
                // Resolve the task with the returned result (if any).
                pendingTask.resolve(result);
            }
            catch (error) {
                // If the task is stopped, ignore it.
                if (pendingTask.stopped)
                    return;
                // Reject the task with its own error.
                pendingTask.reject(error);
            }
        });
    }
}
exports.AwaitQueue = AwaitQueue;
