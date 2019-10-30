# AwaitQueue

JavaScript utility to enqueue async tasks for Node.js and the browser.


## Installation

```bash
$ npm install awaitqueue
```

## Usage

* CommonJS usage:

```js
const AwaitQueue = require('awaitqueue');
```

* ES6 usage (see issue below):

```js
import { AwaitQueue } from 'awaitqueue';
```

*ISSUE:* For some reason, in ES6 this does not work:

```js
import AwaitQueue from 'awaitqueue';
```

It should work given that the main module exports a class as follows `module.exports = AwaitQueue;`. However, when using `browserify` + `babel` or `jest`, it fails with:

```
awaitqueue_1.default is not a constructor
```

Issue reported in https://github.com/versatica/awaitqueue/issues/1.


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
const AwaitQueue = require('awaitqueue');

const queue = new AwaitQueue();
let taskCounter = 0;

async function task()
{
  return new Promise((resolve) =>
  {
    setTimeout(() =>
    {
      ++taskCounter

      console.log('task %d done!', taskCounter);

      resolve(taskCounter);
    }, 2000);
  }); 
}

async function run()
{
  let ret;

  console.log('calling queue.push()');
  ret = await queue.push(task);
  console.log('>>> ret:', ret);

  console.log('calling queue.push()');
  ret = await queue.push(task);
  console.log('>>> ret:', ret);
  
  console.log('calling queue.close()');
  queue.close();

  try
  {
    console.log('calling queue.push()');
    ret = await queue.push(task);
    console.log('>>> ret:', ret);
  }
  catch (error)
  {
    console.error('>>> task failed: %s', error.toString());
  }
}

run();
```

Output:

```
calling queue.push()
// after 2 seconds:
task 1 done!
>>> ret: 1
calling queue.push()
// after 2 seconds:
task 2 done!
>>> ret: 2
calling queue.close()
calling queue.push()
>>> task failed: Error: AwaitQueue closed
```


## Author

* Iñaki Baz Castillo [[website](https://inakibaz.me)|[github](https://github.com/ibc/)]


## License

[ISC](./LICENSE)
