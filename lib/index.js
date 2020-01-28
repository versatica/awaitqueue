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
    constructor({ ClosedErrorClass, StoppedErrorClass } = {
        ClosedErrorClass: Error,
        StoppedErrorClass: Error
    }) {
        // Closed flag.
        this._closed = false;
        // Queue of pending tasks.
        this._pendingTasks = [];
        // Error class used when rejecting a task due to AwaitQueue being closed.
        this._ClosedErrorClass = Error;
        // Error class used when rejecting a task due to AwaitQueue being stopped.
        this._StoppedErrorClass = Error;
        this._ClosedErrorClass = ClosedErrorClass;
        this._StoppedErrorClass = StoppedErrorClass;
    }
    /**
     * Closes the AwaitQueue. Pending tasks will be rejected with ClosedErrorClass
     * error.
     */
    close() {
        this._closed = true;
    }
    /**
     * Accepts a task as argument and enqueues it after pending tasks. Once
     * processed, the push() method resolves (or rejects) with the result
     * returned by the given task.
     *
     * The given task must return a Promise or directly a value.
     */
    push(task) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof task !== 'function')
                throw new TypeError('given task is not a function');
            return new Promise((resolve, reject) => {
                const pendingTask = {
                    execute: task,
                    resolve,
                    reject,
                    stopped: false
                };
                // Append task to the queue.
                this._pendingTasks.push(pendingTask);
                // And run it if this is the only task in the queue.
                if (this._pendingTasks.length === 1)
                    this._next();
            });
        });
    }
    stop() {
        for (const pendingTask of this._pendingTasks) {
            pendingTask.stopped = true;
            pendingTask.reject(new this._StoppedErrorClass('AwaitQueue stopped'));
        }
        // Enpty the pending tasks array.
        this._pendingTasks.length = 0;
    }
    _next() {
        return __awaiter(this, void 0, void 0, function* () {
            // Take the first pending task.
            const pendingTask = this._pendingTasks[0];
            if (!pendingTask)
                return;
            // Execute it.
            yield this._executeTask(pendingTask);
            // Remove the first pending task (the completed one) from the queue.
            this._pendingTasks.shift();
            // And continue.
            this._next();
        });
    }
    _executeTask(pendingTask) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._closed) {
                pendingTask.reject(new this._ClosedErrorClass('AwaitQueue closed'));
                return;
            }
            // If stop() was called for this task, ignore it.
            if (pendingTask.stopped)
                return;
            try {
                const result = yield pendingTask.execute();
                if (this._closed) {
                    pendingTask.reject(new this._ClosedErrorClass('AwaitQueue closed'));
                    return;
                }
                // If stop() was called for this task, ignore it.
                if (pendingTask.stopped)
                    return;
                // Resolve the task with the returned result (if any).
                pendingTask.resolve(result);
            }
            catch (error) {
                if (this._closed) {
                    pendingTask.reject(new this._ClosedErrorClass('AwaitQueue closed'));
                    return;
                }
                // If stop() was called for this task, ignore it.
                if (pendingTask.stopped)
                    return;
                // Reject the task with its own error.
                pendingTask.reject(error);
            }
        });
    }
}
exports.AwaitQueue = AwaitQueue;
