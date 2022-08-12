---
layout: post
author: Bruno
title: Retrying API Calls with Exponential Backoff in JavaScript
permalink: entries/retrying-api-calls-with-exponential-backoff
keywords: api,js,javascript,exponential,backoff
meta_description: Making your application more robust with Exponential Backoff.
meta_image: /assets/images/posts/2021-03-01-retrying-api-calls-with-exponential-backoff.jpg
---

Have you ever implemented an integration with a third-party service where you have to call their API endpoints several times a day? Depending on the number of times you call this API, some of those calls will inevitably fail.

One solution to mitigate this problem is to implement a `retry` algorithm. Here is a sequence diagram showing how this algorithm could look like:

![Exponential backoff diagram](/assets/images/posts/api-without-exponential-backoff-diagram.svg)

Notice that once our API call fails, our app immediately tries to call it again. That could be extremely fast and there is nothing wrong with that, but that isn't very effective. Why?

## Being polite with Exponential Backoff

Lets assume the restaurants API we were trying to call on the diagram above is having some trouble. Maybe it's overloaded or is completely down. Retrying to call it immediately after a failed attempt will do no good. It will actually make the situation worse: The restaurants API will be hammered harder and won't have time to recover.

To countermeasure that, we can wait a little before retries. We can actually do better than that. What if on every failed attempt, we exponentially increase the waiting time for the next attempt? Bingo, This is what [Exponential Backoff](https://en.wikipedia.org/wiki/Exponential_backoff) is.

> - Our app tries to call the Restaurants API.
> - The API call fails.
> - Our app waits for `200 millisecods` before calling it again.
> - Our app retries to call the Restaurants API again.
> - The API call fails again.
> - Our app waits for `400 millisecods` before calling it again.
> - Our app retries to call the Restaurants API again.
> - The API call completes successfully.

Here is how the diagram would look like when we implement Exponential Backoff:

![Exponential backoff diagram](/assets/images/posts/api-with-exponential-backoff-diagram.svg)

## How can we do that in Javascript?

The implementation of the algorithm above is actually quite straightforward in Javascript. The implementation below works in Node.js and also in modern browsers, with zero dependencies.

```js
/**
 * Wait for the given milliseconds
 * @param {number} milliseconds The given time to wait
 * @returns {Promise} A fulfilled promise after the given time has passed
 */
function waitFor(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Execute a promise and retry with exponential backoff
 * based on the maximum retry attempts it can perform
 * @param {Promise} promise promise to be executed
 * @param {function} onRetry callback executed on every retry
 * @param {number} maxRetries The maximum number of retries to be attempted
 * @returns {Promise} The result of the given promise passed in
 */
function retry(promise, onRetry, maxRetries) {
  // Notice that we declare an inner function here
  // so we can encapsulate the retries and don't expose
  // it to the caller. This is also a recursive function
  async function retryWithBackoff(retries) {
    try {
      // Make sure we don't wait on the first attempt
      if (retries > 0) {
        // Here is where the magic happens.
        // on every retry, we exponentially increase the time to wait.
        // Here is how it looks for a `maxRetries` = 4
        // (2 ** 1) * 100 = 200 ms
        // (2 ** 2) * 100 = 400 ms
        // (2 ** 3) * 100 = 800 ms
        const timeToWait = 2 ** retries * 100;
        console.log(`waiting for ${timeToWait}ms...`);
        await waitFor(timeToWait);
      }
      return await promise();
    } catch (e) {
      // only retry if we didn't reach the limit
      // otherwise, let the caller handle the error
      if (retries < maxRetries) {
        onRetry();
        return retryWithBackoff(retries + 1);
      } else {
        console.warn('Max retries reached. Bubbling the error up')
        throw e;
      }
    }
  }

  return retryWithBackoff(0);
}
```

And here is how you can quickly test this implementation:

```js
/** Fake an API Call that fails for the first 3 attempts
 * and resolves on its fourth attempt.
 */
function generateFailableAPICall() {
  let counter = 0;
  return function () {
    if (counter < 3) {
      counter++;
      return Promise.reject(new Error("Simulated error"));
    } else {
      return Promise.resolve({ status: "ok" });
    }
  };
}

/*** Testing our Retry with Exponential Backoff */
async function test() {
  const apiCall = generateFailableAPICall();
  const result = await retry(
    apiCall,
    () => {
      console.log("onRetry called...");
    },
    4
  );

  assert(result.status === 'ok')
}

test();
```

If you want to try this out, here is a [Codesanbox link](https://codesandbox.io/s/exponential-backoff-ziy8h?file=/src/index.js) where you can play with it.
