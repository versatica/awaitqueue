# AwaitQueue

JavaScript utility to enqueue async tasks for Node.js and the browser.


## Installation

```bash
$ npm install awaitqueue
```

## Usage

* CommonJs usage:

```js
const AwaitQueue = require('awaitqueue');
```

* ES6 usage:

```js
import AwaitQueue from 'awaitqueue';
```


## API

### new AwaitQueue({ ClosedErrorClass = Error })

Creates an `AwaitQueue` instance.

* `@param {Error} ClosedErrorClass`: Custom `Error` derived class that will be used to reject pending tasks after `close()` method has been called. If not set, `Error` class is used.


### async awaitQueue.push(task)

Accepts a task as argument and enqueues it after pending tasks. Once processed, the `push()` method resolves (or rejects) with the result returned by the given task.

* `@param {Function} task`: Function that must return a `Promise` or a value directly.


### awaitQueue.close()

Closes the queue. Pending tasks will be rejected with `ClosedErrorClass` error.


## Usage example

```js
import AwaitQueue from 'awaitqueue';

const queue = new AwaitQueue();
let taskCounter = 0;

async function task()
{
  return new Promise((resolve) =>
  {
    setTimeout(() =>
    {
      console.log('task %d done!', ++taskCounter);

      resolve();
    }, 2000);
  }); 
}

queue.push(task);
queue.push(task);
queue.push(task);
```

Output:

```
// after 2 seconds:
task 1 done!

// after 2 seconds:
task 2 done!

// after 2 seconds:
task 3 done!
```


## Author

* Iñaki Baz Castillo [[website](https://inakibaz.me)|[github](https://github.com/ibc/)]


## License

[ISC](./LICENSE)
