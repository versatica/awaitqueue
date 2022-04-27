# AwaitQueue

JavaScript utility to enqueue async tasks for Node.js and the browser.


## Installation

```bash
$ npm install awaitqueue
```

## Usage

* CommonJS usage:

```js
const { AwaitQueue, AwaitQueueTask, AwaitQueueDumpItem } = require('awaitqueue');
```

* ES6 usage:

```js
import { AwaitQueue, AwaitQueueTask, AwaitQueueDumpItem } from 'awaitqueue';
```


## API

### type AwaitQueueDumpItem

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

* `idx`: Index of the task (0 means the task being processed).
* `task`: The function to be executed.
* `name`: The name of the given `function` (if any) or the `name` argument given to `awaitQueue.push()` method (if any).
* `enqueuedTime`: Time in milliseconds since the task was enqueued, this is, since `awaitQueue.push()` was called until its execution started or until now if not yet started.
* `executingTime`: Time in milliseconds since the task execution started (or 0 if not yet started).

### type AwaitQueueTask

```typescript
type AwaitQueueTask<T> = () => (Promise<T> | T)
```

TypeScript type representing a function that returns a value `T` or a Promise that resolves with `T`.

### new AwaitQueue({ ClosedErrorClass? = Error, StoppedErrorClass? = Error, RemovedTaskErrorClass? = Error })

Creates an `AwaitQueue` instance.

* `@param {Error} ClosedErrorClass`: Custom `Error` derived class that will be used to reject pending tasks after `close()` method has been called. If not set, `Error` class is used.
* `@param {Error} StoppedErrorClass`: Custom `Error` derived class that will be used to reject pending tasks after `stop()` method has been called. If not set, `Error` class is used.
* `@param {Error} RemovedTaskErrorClass`: Custom `Error` derived class that will be used to reject pending tasks after `removeTask()` method has been called. If not set, `Error` class is used.

### async awaitQueue.push(task: AwaitQueueTask<T>, name?: string): Promise<T>

Accepts a task as argument and enqueues it after pending tasks. Once processed, the `push()` method resolves (or rejects) with the result returned by the given task.

* `@param task`: Function that must return a `Promise` or a directly a value.
* `@param name`: Optional task name (useful for `awaitQueue.dump()` method).

### awaitQueue.removeTask(idx: number): void

Removes the pending task with given index. The task is rejected with an instance of `RemovedTaskErrorClass`.

Pending task with index 0 cannot be removed.

### awaitQueue.size: number

The number of ongoing enqueued tasks.

### awaitQueue.close(): void

Closes the queue. Pending tasks will be rejected with an instance of `ClosedErrorClass`. The `AwaitQueue` instance is no longer usable (this method is terminal).

### awaitQueue.stop(): void

Make ongoing pending tasks reject with an instance of `StoppedErrorClass`. The `AwaitQueue` instance is still usable for future tasks added via `push()` method.

### awaitQueue.dump(): AwaitQueueDumpItem[]

Returns an array with information about pending tasks in the queue. See the `AwaitQueueDumpItem` type above.

## Usage example

```js
const { AwaitQueue } = require('awaitqueue');

function taskFactory(id)
{
  console.log('creating task %d', id);

  // Return a function that returns a Promise (a task).
  return function()
  {
    return new Promise((resolve) =>
    {
      console.log('running task %d', id);
      setTimeout(() => resolve(id), 2000);
    });
  };
}

async function run()
{
  const queue = new AwaitQueue();
  let result;

  console.log('1. calling queue.push()');
  result = await queue.push(taskFactory('1'));
  console.log('1. task result:', result);

  console.log('2. calling queue.push()');
  result = await queue.push(taskFactory('2'));
  console.log('2. task result:', result);

  console.log('3. calling queue.push()');
  await new Promise((resolve) =>
  {
    queue.push(taskFactory('3'))
      .then(() =>
      {
        console.warn('3. task should not succeed (it was stopped)');
        resolve();
      })
      .catch((error) =>
      {
        console.log('3. task failed as expected because it was stopped (%s)', error.toString());
        resolve();
      });

    console.log('3. calling queue.stop()');
    queue.stop();
  });

  console.log('calling queue.close()');
  queue.close();

  try
  {
    console.log('4. calling queue.push()');
    await queue.push(taskFactory('4'));
  }
  catch (error)
  {
    console.error('4. task failed as expected because it was closed (%s)', error.toString());
  }
}

run();
```

Output:

```
1. calling queue.push()
creating task 1
running task 1
1. task result: 1

2. calling queue.push()
creating task 2
running task 2
2. task result: 2

3. calling queue.push()
creating task 3
running task 3
3. calling queue.stop()
3. task failed as expected because it was stopped (Error: AwaitQueue stopped)

calling queue.close()

4. calling queue.push()
creating task 4
4. task failed as expected because it was closed (Error: AwaitQueue closed)
```


## Author

* Iñaki Baz Castillo [[website](https://inakibaz.me)|[github](https://github.com/ibc/)]


## License

[ISC](./LICENSE)
