# AwaitQueue

JavaScript utility to enqueue async tasks for Node.js and the browser.


## Installation

```bash
$ npm install awaitqueue
```

## Usage

* In ES6:

```js
import { AwaitQueue, AwaitQueueTask, AwaitQueueDumpItem } from 'awaitqueue';
```

* In CommonJS:

```js
const { AwaitQueue, AwaitQueueTask, AwaitQueueDumpItem } = require('awaitqueue');
```


## Types

#### `type AwaitQueueTask`

```typescript
type AwaitQueueTask<T> = () => (Promise<T> | T)
```

TypeScript type representing a function that returns a value `T` or a Promise that resolves with `T`.

#### `type AwaitQueueDumpItem`

```typescript
type AwaitQueueDumpItem =
{
  idx: number;
  task: AwaitQueueTask<unknown>;
  name?: string;
  enqueuedTime: number;
  executingTime: number;
};
```

TypeScript type representing an item in the array returned by the `awaitQueue.dump()` method.

* `idx`: Index of the pending task in the queue (0 means the task being processed now).
* `task`: The function to be executed.
* `name`: The name of the given `function` (if any) or the `name` argument given to `awaitQueue.push()` method (if any).
* `enqueuedTime`: Time in milliseconds since the task was enqueued, this is, since `awaitQueue.push()` was called until its execution started or until now if not yet started.
* `executingTime`: Time in milliseconds since the task execution started (or 0 if not yet started).


## API

#### `new AwaitQueue()`

Creates an `AwaitQueue` instance.

#### `awaitQueue.size: number`

The number of enqueued tasks.

#### `async awaitQueue.push(task: AwaitQueueTask<T>, name?: string): Promise<T>`

Accepts a task as argument and enqueues it after pending tasks. Once processed, the `push()` method resolves (or rejects) with the result returned by the given task.

* `@param task`: Function that must return a `Promise` or a directly a value.
* `@param name`: Optional task name (useful for `awaitQueue.dump()` method).

#### `awaitQueue.removeTask(idx: number): void`

Removes the pending task with given index. The task is rejected with an instance of `AwaitQueueRemovedTaskError`. Pending task with index 0 cannot be removed.

* `@param idx`: Index of the pending task to be removed.

#### `awaitQueue.close(): void`

Closes the queue. Pending tasks will be rejected with an instance of `AwaitQueueClosedError`. The `AwaitQueue` instance is no longer usable (this method is terminal).

#### `awaitQueue.stop(): void`

Make pending tasks reject with an instance of `AwaitQueueStoppedError`. The `AwaitQueue` instance is still usable for future tasks added via `push()` method.

#### `awaitQueue.dump(): AwaitQueueDumpItem[]`

Returns an array with information about pending tasks in the queue. See the `AwaitQueueDumpItem` type above.


## Usage example

See [test.ts](src/test.ts) file.


## Author

* Iñaki Baz Castillo [[website](https://inakibaz.me)|[github](https://github.com/ibc/)]


## License

[ISC](./LICENSE)
