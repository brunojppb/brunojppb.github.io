---
layout: post
author: Bruno Paulino
title: "Why deployment previews?"
permalink: entries/dev-previews
keywords: web,performance,development,deployment
meta_description:
  Why dev deployment previews are important for high-performing teams
---

Today I was grabbing a coffee with an engineering leader I really admire at work
and we had a chat about how powerful dev deployment previews can be for web
applications.

As a Product Engineer, you want to ship fast, but not at the cost of quality.
That’s why pragmatic practices like trunk-based development, short-lived
branches, and continuous integration/deployment (CI/CD) are essential. But to
truly build a high-performing product, you need to validate changes in a
real-world environment without the risk of breaking production.

This is where dev deployment previews make a difference. With ephemeral
environments, you can quickly spin up a preview, generate a shareable URL, and
let Product Managers, Designers, and Engineers test changes as if they were real
users. At the end, once an engineer merges the pull-request, the environment can
be removed automatically, freeing-up infrastructure resources.

A common challenge we discussed, particularly for companies with hundreds of
microservices was how do you create a deployment preview without deploying every
dependency? This is certainly a challenge, but if your application directly
depends on hundreds of microservices, you likely have a deeper architectural
issue to solve first. Ideally, you should have clear abstractions for upstream
dependencies, allowing you to deploy mocked versions that provide just enough
functionality to test until your application’s boundaries without needing your
full microservice deployment landscape.

Many SaaS platforms provide deployment previews by default like Netlify or
Vercel, but this isn't something that is impossible to achieve internally on
your own infrastructure.

This conversation was a lot of fun and reminded me why I love building software.
It's all about speed, collaboration, and getting feedback early.
