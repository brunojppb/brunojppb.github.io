---
layout: post
author: Bruno Paulino
title: DevOps and its impact on Developer Productivity 
permalink: entries/devops-and-its-impact-on-developer-productivity
keywords: devops,operations,productivity,deploy
meta_description: The importance of software delivery performance and the value it brings to any organization that takes it seriously.
meta_image: /assets/images/posts/2020-11-22-devops-and-its-impact-on-developer-productivity.jpg
---

I have recently finished reading [Accelerate: building and Scaling High Performing Technology Organizations](https://www.goodreads.com/book/show/35747076) to get a more in-depth view into the DevOps landscape and its influence in developer productivity. The book is based on solid research conducted by [Dr. Nicole Forsgren](https://twitter.com/nicolefv), [Jez Humble](https://twitter.com/jezhumble) and [Gene Kim.](https://twitter.com/RealGeneKim) The book is an eye-opener for the importance of software delivery performance and the value it brings to any organization that takes it seriously.

This book made me reflect on my experience with DevOps, my own productivity and the productivity of my team. I don’t want to quote every topic mentioned in the book here, but I absolutely recommend you to give it a read. My focus is actually to explore how it relates to my journey adopting DevOps along my career and the benefits it brings.

## Shipping code to production and developer confidence

When I started my career, I worked at a company where the deployment process was done by a magician developer that held all the powers. Nobody was allowed to deploy code unless this wizard could cast his spells. The second problem we had was that all engineers knew how to run the application on their local machines but once the rubber hits the road, nobody had a clue about setting up dependencies and building the application for production.

That was a terrible workflow to work with and once during a lucky day, I had no choice but to perform a production deployment by myself. I was feeling scared just thinking about what could go wrong. Having this deployment workflow was a huge blow on the confidence of the engineers in my team, including myself, where not only nobody wanted to be responsible for it, but also not a single person wanted to get involved with it.

Over the years, I started to learn about DevOps and incrementally adopted it wherever I go so I could avoid the bad experience I had in the past. Since then, I have been reaping the benefits of it over and over again. The productivity gain was immense.

## Starting with Continuous Integration

To start things off, you want to make your deployment process as predictable and as reproducible as possible. Which means that you have to make sure the work done by a developer can be built, tested and deployed to a safe environment, only then it can be shipped to production. This is called Continuous Integration (CI). Once you define and validate your integration steps for your application stack, be it Java, Node.js or even mobile apps, you must reproduce those steps in code using version control, better yet if you can make this a part of your application repository. As an example, those steps could look like this:

- Code is committed by an engineer in a feature branch
- A build of the application is triggered. This build is technically production-grade, which means that it has minimal or no difference between development and production, mainly configuration differences (e.g. a sandbox payment gateway where fake payments can be issued), preferably configured via environment variables
- A suite of automated tests will be executed on this build
- Once all tests pass, the code can be reviewed and merged to the production branch (commonly known as main)

The steps above can be performed by any developer in the team. Once you have a continuous integration pipeline in place, the engineers don’t even have to think about it much since they can be triggered automatically by a continuous integration service like [Github Actions](https://github.com/features/actions) or [Gitlab CI.](https://docs.gitlab.com/ee/ci/)

Once you have this process in place, you will have robustness built-in on your development workflow, which will inevitably lead to more confidence with your code, ultimately leading to more productivity.

## Nail it down with Continuous Deployment

What if I told you that once code is reviewed and merged to your production branch, this code could be automatically released to production with minimal or no impact to your users? Yes, that is possible. This is called Continuous Deployment (CD). The same thought process applied to continuous integration can be transferred to your deployment workflow, where automated pipelines will make sure your code is pushed to your servers clusters.

Here you can apply the same constraints as before: You want to make sure that every deployment is predictable and reproducible. Any failed steps should leave traces (logs, error messages/code) for further inspection and debug. Here is an example on how it could work for a backend application deployed in a multi-node architecture.

- Code is merged into the production branch (Build and tests were previously executed, so the confidence level here is already very high)
- Traffic is diverted to specific nodes in your cluster, inactive nodes are updated with the new version of your build. This step is done incrementally for every node, which will result in a [zero downtime deployment (or blue/green deployment)](https://spring.io/blog/2016/05/31/zero-downtime-deployment-with-a-database)
- Notification is sent to your team about the newly deployed version. Could be as simple as an email or more sophisticated integrations with your internal chat of choice. (e.g. [Slack](https://slack.com/intl/en-at/), [Matterost](https://mattermost.com))

Once again, all the steps mentioned above can be executed automatically, with zero manual intervention. Of course, you won’t probably have the full confidence to do it right away, which is totally understandable. But you can start with small steps by automating the process in code and triggering them manually in the beginning. Once the confidence is high enough, this step can be performed automatically for every new code merged.

Once you enable anyone in your team to perform a deployment with confidence, the productivity of your peers will be noticeably better. As a result, you will be delivering value to your customers much faster, most probably much faster than other companies that don’t adopt such practices, which will give an edge on the competition.

## Where to go from here

If you are reading about CI and CD for the first time, fear not, you can absolutely do this and adopt such practices. Start with very small actions, I like to call it "start with baby steps". Do you build and test your application manually? Start by automating the build steps in a simple script. Have no automated test suite? Start adding automated tests to critical paths on your app. Those steps will slowly build robustness and resilience into your codebase.

Once you are confident enough with your first scripts, make it executable from a remote service like Github Actions. That is a good start to enable your team to execute the same steps without being concerned with having the right machine or dependency installed.

## Wrapping up

DevOps is a very broad topic and we have only covered a very shallow surface here, so there is much more to learn and explore. If you are an engineer and you let the "Ops team handle it", I ask you to look at it differently. You don’t have to become a DevOps specialist, but if you manage to include DevOps on your tool belt, you and your team will be much better off.

There is also a very interesting chapter in the book where specific actions can be taken by managers so software delivery is treated as a "first-class citizen" across your organization. Some actions that I find very interesting and I have personally seen it working:

- Use failure as a learning opportunity to improve
- Create budgets for continuous learning and training
- Space to explore new ideas and share it with others
- Let your team use their tool of choice (in other words, don’t force them to write Java if they are high-skilled and productive with JavaScript)
