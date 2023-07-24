---
layout: post
author: Bruno Paulino
title: "Distributed Lock in Node.js"
permalink: entries/distributed-lock-in-node-js
keywords: lock,distributed,node,redis,typescript,javascript,scale
meta_image: /assets/images/posts/2023-07-23-node-distributed-lock.jpg
meta_description:
  Implementing distributed lock in Node.js using TypeScript, Redis and Xstate
---

Often times, you need to build a feature that requires coordinated access to a
certain resource. A common use-case is around queues where jobs can be enqueued
to be processed in the background.

These jobs can either be:

1. Picked up by a fleet of workers and be processed in parallel. The order they
   start and finish don't matter.
1. Picked up and processed serially. The order they are processed matter.

The first case is generally simple enough. You generally don't have to concern
yourself with race conditions. Jobs can be processed successfully (or failed and
retried) in any order they come in.

But what happens when you must guarantee that their processing order be
respected? If you have a single server and a single worker thread, then it's
simple. Jobs will be processed serially and their ordering will be respected.

But what happens if you have a fleet of workers deployed across different
servers? You will need to "elect" one of your workers to be the one processing
these jobs. Better yet, you must make sure that if that worker dies or gets
removed from your servers pool, another healthy worker must pick-up the jobs and
continue processing them in some sort of handover fashion. This is where a
distributed lock algorithm is handy.

> If you are a savvy Node.js engineer and just want to see the code,
> [here is the Github repo ready for you.](https://github.com/brunojppb/node-distributed-lock)
> Feel free to leave a Github star so folks can find distributed lock template
> more easily.

## Locks on a single node

[A lock](<https://en.wikipedia.org/wiki/Lock_(computer_science)>) is a common
mechanism that helps the programmer to restrict access (mutual exclusion) to
certain resources, allowing you to control which thread can read or write to
shared data.

In a single-thread runtime like Node.js, you generally don't need locks, but in
multi-threaded environments like in [Rust](https://www.rust-lang.org/), you
usually need to use the primitives for atomic operations provided by the
standard library like the
[std::sync::Mutex](https://doc.rust-lang.org/std/sync/struct.Mutex.html), which
guarantees that a given code path is only accessed by one thread at a time.

Primitives like this are super useful, but our use-case goes beyond one single
server. Remember that we are crossing the boundaries of a server here and we
must make sure that other workers do not process our jobs in case one worker is
already processing them.

We need to extend the concept of a lock and make it distributed, where other
servers can also see who is holding the lock and act accordingly.

## Making our lock distributed with Redis

Given that we must share the lock state across servers, we need some sort of
distributed data sharing mechanism that can synchronize this data across our
fleet of workers. We could somehow connect our workers and send messages among
them, but that would be quite complex to pull it off. Another alternative is to
use a shared data store like a database that can make the lock state instantly
available across our servers. Redis fits perfectly for that purpose.

Redis is a fantastic technology. If you are not familiar with it,
[Redis](https://github.com/redis/redis) is an in-memory database. It is
incredibly fast and can act as a shared cache across your cluster of servers.

Redis provides APIs for atomic operations, which will support us in guaranteeing
that only a single worker can acquire a lock at any given time. We will see that
in action soon, but this blogpost largely follows the pattern suggested by Redis
itself in its
[patterns manual here](https://redis.io/docs/manual/patterns/distributed-locks/)
called **Redlock** for cases where we have a single instance of Redis.

To facilitate the understanding on how the distributed lock works, have a look
at the following diagram. We have a pool of four workers which are Node.js
servers responsible for processing our hypothetic serial queue. These four
servers will concurrently try to acquire the lock by setting a key-value pair in
Redis. The first server that manages to do it, "wins" and will hold the lock.
With the lock at hand, this server should be able to start processing jobs.

![Lock with Redis - lock acquired by server](/assets/images/posts/lock_1.jpg)

Then, in case this server needs to be shutdown (e.g. during a deployment), the
lock should be released, giving the chance to one of the other servers to
acquire it and continue to process the background jobs.

![Lock with Redis - Server shutdown](/assets/images/posts/lock_2.jpg)

## Fail-safe with expiring keys

So far, our example has been focusing on releasing the lock when a server needs
to shutdown. But what happens during a hardware failure? What if your app panics
and crashes out of nowhere? This situation could lead you to a
[deadlock](https://en.wikipedia.org/wiki/Deadlock) where no other server from
your server pool will be able to acquire the lock and keep processing your jobs.

Redis provides a very useful feature where whenever you set a key-value pair,
you can also define how long this value can last on its memory. Redis will clean
it up automatically after the given time passes.

We will be seeing how to set a key with an expiry time very soon, but here is
how it will look like at a high-level:

![Lock auto-release with Redis expiry](/assets/images/posts/lock_3.jpg)

### Renewing the lock from time to time

Given that our lock, represented by the entry we store in Redis, expires
automatically after a certain time, we must make sure that our worker that holds
the lock can renew the lock from time to time to make sure that it's still the
one holding the lock.

To perform that, Redis also provides an API to specifically change the expiry
time of a given key. The [EXPIRE](https://redis.io/commands/expire/) command
will help us to accomplish that.

But enough theory, let's dip into the code and see that in action.

## Kicking off with a Demo

Our will start by demonstrating this implementation in action so you get a
feeling of how it works and then we will have a look at the code, step-by-step.

To kickstart this project, I've used [Remix](https://remix.run/) with the
[Express adapter](https://remix.run/docs/en/main/other-api/adapter) so I can
have a super quick project already setup with TypeScript. The code is available
[here](https://github.com/brunojppb/node-distributed-lock), so just clone it,
`npm install` to kick things off.

But before running our Node.js app, we need Redis available as a dependency so
our app can connect to it. The simplest way to install Redis is to use
[Docker](https://www.docker.com/). Our project already comes with a handy
`docker-compose` file that bootstraps Redis for you.

So make sure that Docker is running and just execute the following:

```shell
docker-compose up -d
```

This is going to run Redis in the background, which will be a perfect fit for
our app. Now, copy the `.env.example` file and rename it to `.env`. This should
be enough for starting our app:

```shell
npm run dev
```

If you watch your server logs, you see a few logs showing that:

- Your node tried to acquire the lock
- The lock was successfully acquired
- It's doing some (simulated) work like processing background jobs

```log
Trying to acquire lock { workerId: '01H63B5EAKQZTCDAT8AAVQ9WAG' }
Lock acquired. Starting work { workerId: '01H63B5EAKQZTCDAT8AAVQ9WAG' }
Doing some heavy work... { workerId: '01H63B5EAKQZTCDAT8AAVQ9WAG' }
```

Now, open a new terminal window and fire up a new process from our Node.js app
on a different port with the following command:

```shell
PORT=3001 npm run dev
```

This simulates having another server of your app running and trying to acquire
the lock. You will only see that your new process will keep trying to acquire
the lock every 5 seconds.

```log
Trying to acquire lock { workerId: '01H63B9M322QAP09D6EJ19SGWC' }
```

Now, shutdown your app on your first terminal window, the one holding the lock.
Have a look at the second terminal window now. It should pick up the lock and
start processing the background jobs.

```log
Trying to acquire lock { workerId: '01H63B9M322QAP09D6EJ19SGWC' }
Lock acquired. Starting work { workerId: '01H63B9M322QAP09D6EJ19SGWC' }
Doing some heavy work... { workerId: '01H63B9M322QAP09D6EJ19SGWC' }
```

> Notice that we always log the worker ID, so it's easy to identify which worker
> node has the lock and which ones are just waiting and trying to acquire it.
> The Node ID is a fundamental part of this lock implementation given that we
> use it to identify which node is actively holding the lock. The Node ID is
> automatically assigned during startup time.

## Managing our lock state using a state machine

You are probably asking yourself:

> "How does each node knows how and when to acquire the lock or wait to try
> acquiring it again?"

This is where state machines come in. They help us to model our state
transitions in a very elegant way.

I personally enjoy using [xstate](https://github.com/statelyai/xstate), a finite
state machines library that helps us to model how our state looks like and the
transition between them, including failure modes.

The folks from [Stately](https://stately.ai/), the maintainers of this library,
even provide a Web UI for modeling and visualizing our state machine. Here is
how it looks like:

![State machine chart for our distributed lock](/assets/images/posts/lock_worker.jpg)

You can also play with
[this interactive demo here](https://stately.ai/viz/7ad688b3-4910-41d1-9fe7-70b2a426d5c4).
On this UI, you can simulate all the state transitions and visually see how the
state machine works.
