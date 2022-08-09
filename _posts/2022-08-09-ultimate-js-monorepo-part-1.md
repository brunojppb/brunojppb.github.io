---
layout: post
author: Bruno Paulino
title: "Monorepo Series - part 1: What is a monorepo?"
permalink: entries/what-is-a-monorepo
keywords: monorepo,typescript,javascript,scale,teams
meta_description: Why a monorepo can be the best way for scaling your teams
---

# The ultimate JavaScript Monorepo Series

Welcome to the ultimate monorepo article series. In this series, you will learn
about what a monorepo is, why it's becoming so popular today and how to build
your own production-ready monorepo with a Web application, a documentation
website and a component library, all built with TypeScript.

If you are working on an small and isolated app, chances are that you probably
don't need a monorepo. But if you are building several different apps and small
libraries that somehow are related or dependent on each other, a monorepo is most
probably the best strategy to organize your code. It will make your code much closer
to the engineers working on them and will give your team a great
productivity boost in the short and long-run.

So bear with me and let's do a deep dive into monorepos and how to create a
rock-solid version of it that your team is going to love to use. By the end of
this series, you will have a complete TypeScript monorepo template to start your
projects with the right foot.

## What is a monorepo?

Before defining what a monorepo is, let's take a step back and understand how
teams usually go about creating new software projects and how they manage their
codebases. Teams across the globe need a way to share code. And the _de facto_
standard is [Git.](https://git-scm.com/) We will start with an hypothetical
scenario where we need to create a Web application and discuss the challenges
that a team might face along the way.

When starting out, you usually create a git repository offline on
your machine and eventually you share your code with your team using the
platform of your choice, the most popular being [Github.](https://github.com/)
This repository is usually the house of your app. It's where it lives your
business logic, build and deployment pipelines, automated tests (hopefully) and
the history of your changes.

When starting a new project, you usually do the following:

- Create a new Git repo
- Setup your project from scratch or based on a template with build, test and
  deployment pipelines
- Configure tools to help you with your development workflow, for instance a dev server.

Once the initial setup is done, you go about your work building your Web app for
your users. This is all good and fine, but now your team needs to build a
component library with common standards like buttons, colors, spacing, fonts and
all the visual identity of your brand. This component library uses the same
technologies you are using to build your Web app like TypeScript and a very
similar, but different, build pipeline. So to start working on this new
component library, you usually have two choices:

1. Build the component library as a subdirectory of your app, just like any other
   shared module.
2. Decouple your component library from your app in a separate repository so
   engineers can work independently on both the App and the Component library.

Let's break these options down and explore their trade-offs next.

### Option 1: Building as a subdirectory

This option has a clear advantage:

- **Your entire setup is already in place.**

  - You can start creating your component library right away and make use of
    your testing and build pipelines. Your Web app can use these components
    without any ceremony.

- **Team collaboration is high**
  - Having the team working on the Web app and Component library all together
    under the same repo will be a lot better for collaboration. They can review
    each other's PRs, quickly test changes locally without extra setup and
    share the same standards, significantly reducing mental overhead.

But there are a few drawbacks with this approach:

- **You cannot version your components.**
  - Which means that if you make a breaking change on your Button component,
    your entire Web app needs to be changed in one go, otherwise you will not be
    able to build your app.
- **nobody else can use your component library.**
  - Eventually, you might need to build an internal Web app to manage your
    customers and ideally this internal Web app could have the same visual
    identity as your public app. But given the Component library is tightly
    coupled with your Web app, you can't share your component library outside of your repo.

### Option 2: Creating a new repository

If the trade-offs of option 1 are not acceptable, you need an alternative way,
so the usual route taken by most teams is to go and create a new repository and
make your component library an independent package. This approach has several
benefits:

- **You can version your components**

  - You can now make breaking changes to your components and as long as you
    publish different versions of your library to a registry like [npm](https://www.npmjs.com/),
    consumers of your component library can remain safe until they decide to
    upgrade to the newest version of your component library.

- **More than one app can use your components**
  - Since you now publish your component library as an independent package,
    other apps can now use it just as any other library out there.
    They can `npm install @acme/components` and they are ready to go.

But like any architecture choices, there are trade-offs we must consider:

- **You can no longer make sure that your app is using the latest version of
  your components**

  - This might be a desired side-effect, so you can actually let you team adopt
    the new versions of your component library in an incremental way. On the
    other hand, if you don't prioritize library upgrades, your component library
    will get stale on your web app and if you wait for too long, major changes
    might make it very difficult for an upgrade.

- **You now have two codebases to worry about**

  - Let's face it, setting up a project from the ground up, with all it's build
    and test pipelines in a way that is ready for production and with great developer
    experience takes time. Now you have two repositories to keep
    dependencies, integration and deployment pipelines all updated. This can
    become a major mental overhead for your team, specially if you cannot afford to have
    a dedicated team member or a platform team to support you with these tasks. Your
    Web app and Component library repositories will grow apart and they will
    eventually have divergent standards. Questions like "Which version of
    TypeScript we are using?" or "Which Node version we are using now?" will be
    harder to answer and even harder to make sure that everyone is at the same
    page.

- **Engineers cannot collaborate in the same codebase anymore**
  - You now have two independent codebases where engineers need to implement new
    features, make changes, review pull-requests and push code to production.
    But now they are far apart in two different repositories, which means that
    engineers cannot review changes in a single pace anymore. If they want to
    checkout these changes locally, they will need to have the repositories all
    setup locally and if it's their first time working on the component library,
    they might need to prepare their local environment from scratch to be able
    to run and explore the code.

### What is the alternative?

With all the being said, there are plenty of trade-offs here that might be hard
to reach to a compromise. Both options 1 and 2 mentioned above are perfectly
reasonable, but it will really depend on the context you are working with.

The example given here is very small in context. We are only considering a Web
app and a component library. What if you are part of a larger organization, with
dozens of engineers working on several different apps, component libraries and
other smaller libraries that need to be shared across all these apps? This is
where a monorepo can be very handy.

## A monorepo might be your best choice

What if I told you that there was a way to keep all your apps and libraries
under the same git repository and still keep them isolated from each other,
behaving just like libraries, but with all the benefits of working under the
same repo?

This is what a **monorepo** is. A set of tools and practices that allow you to
work under the same repository, but still be able to leverage module isolation
and team autonomy.

In the JavaScript/TypeScript ecosystem, this is possible due to a native
feature called [workspaces](https://pnpm.io/workspaces)
which allows us to manage independent packages nested under a top-level root package.
You will see that in practice during this series, but this subtle difference has a huge
difference:

- **You team can now work together in the same repo**

  - Which means that working across different apps and libraries is just
    transparent. No need to clone a different repo, check Node and package
    manager version or anything that could drift apart in your tech stack and standards.
    With a monorepo, we can guarantee that all apps and libraries are using the
    exact same version of every dependency.

- **Libraries and apps can still be versioned and published individually**
  - Given that packages are isolated, you can still work on them individually,
    making changes and publishing new versions to npm as you need. For packages
    that contain applications that require a deployment step to some cloud
    environment, it can be handled in the exact same way libraries are
    published, just with a different deployment workflow. You will see that
    being applied during this series.

With that being said, a monorepo isn't a
[silver bullet](http://worrydream.com/refs/Brooks-NoSilverBullet.pdf). It does
come with challenges and we will talk about as we start building our monorepo
example.

## What is next

In the next article, we will start by creating our monorepo from scratch,
setting up a Web app, a Component library and a Documentation website.
All of them will be fully independent within their own packages and we will
be able to build, test and deploy them independently.

Stay tuned for the next blogpost.
