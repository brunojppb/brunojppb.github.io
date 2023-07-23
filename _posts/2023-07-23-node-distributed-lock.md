---
layout: post
author: Bruno Paulino
title: "Distributed Lock in Node.js"
permalink: entries/distributed-lock-in-node-js
keywords: lock,distributed,node,redis,typescript,javascript,scale
meta_image: /assets/images/posts/2023-07-23-node-distributed-lock.jpg
meta_description:
  Implementing distributed lock in Node.js using Redis and Xstate
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

# Locks on a single node

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

# Making our lock distributed with Redis

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
[patterns manual here](https://redis.io/docs/manual/patterns/distributed-locks/).

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

# Fail-safe with expiring keys
