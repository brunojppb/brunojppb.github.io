---
layout: post
author: Bruno Paulino
title: "The TypeScript Monorepo Series: Packages and Workspaces"
permalink: entries/typescript-monorepo-series-packages-and-workspaces
keywords: monorepo,typescript,javascript,turborepo,dx,packages,workspaces,pnpm
meta_image: /assets/images/posts/2022-09-03-ts-monorepo-series-part-2.jpg
meta_description: Creating our monorepo with packages and workspaces
---

Continuing our TypeScript monorepo series, in this article we will start with
the most fundamental part of it all: Create our repository from scratch,
configure workspaces and create our packages that will represent self-contained
apps and libraries with different objectives:

1. `@monorepo/web`: A Next.JS App that will be deployed to Vercel
2. `@monorepo/docs`: A statically generated app that will deployed Vercel
3. `@monorepo/core`: ReactJS component library that is published to npm

The packages above are fully self-contained. They will have their own
`package.json` file with their own dependencies and scripts declared. The
monorepo setup will facilitate the communicate between these packages as we will
see along this article.

## Dependencies to follow along

To follow along this article series and if you really want to get your hands
dirty by coding along, you will need a few things installed on your machine.

### Text editor of your choice

I will be using [Visual Studio Code](https://code.visualstudio.com/), but feel
free to use whatever you prefer.

### NodeJS

We will be working with NodeJS from now on, so make sure that you have Node 16
installed. The easiest way to do this is using [volta.sh](https://volta.sh/) for
installing and managing your NodeJS versions installed on your machine.

Once you setup NodeJS, you should have Node 16 or above available. To check this
out, go your terminal and type the following command:

```shell
# Check node version
node -v
# you should see an output similar to the following:
v16.14.0
```

## Using pnpm as our package manager

By default, when you install Node, npm comes along with it. npm came a long way
and it now has native support for workspaces. But instead of npm, we will be
using [pnpm](https://pnpm.io/), which is an alternative package manager that
does what npm do, but it is focused on performance (`p` in pnpm standard for
performant) and in my experience, it has been much faster than npm and yarn when
managing dependencies.

So let's start by installing pnpm with the following command:

```shell
pnpm install -g pnpm@7
```

This is going to install pnpm globally on your machine, so from now on, you can
execute pnpm commands directly, without using npm.

## Creating our base structure

Since we are doing everything from scratch here, we will be creating the first
file a JavaScript/TypeScript repo needs: `package.json`. To do that, we will use
pnpm. Let's prepare a directory so we create our repo within it:

```shell
# Create a new directory and go within it
mkdir monorepo && cd monorepo
# use pnpm to init our repo
pnpm init
```

This is going to create a `package.json` with some boilerplate. Let's open it
and modify its contents to have the following:

```js
{
  "name": "@monorepo",
  "version": "1.0.0",
  "description": "The TypeScript monorepo",
  "private": true,
  "scripts": {},
  "keywords": [],
  "author": "your_name_here",
  "license": "ISC"
}
```

We have changed a few things there:

1. Added the `private` field. This makes sure that this package isn't published
   by mistake on npm.
2. Changed the name to `@monorepo`. Pay attention to the `@` in the beginning.
   This isn't required, but it's mostly a convention we see around monorepos.
   This usually signals that more packages are available under this name, which
   in our case we will have three of them, for example `@monorepo/web`.

Let's now start [git](https://git-scm.com/) so we can keep track of our code
changes. You can do that with the following:

```shell
git init
```

With our git repo initialized, let's add a `.gitignore` file to our repo so we
can skip a few things like `node_modules` and other files we generate. Add the
following contents:

```shell
node_modules
dist
.vercel
.next
.turbo
# misc
.DS_Store
*.pem
.npmrc
.pnpm-store
# debug
npm-debug.log*
.pnpm-debug.log*
# Editors and IDEs
.idea
.vscode
```

We won't go into much detail on each of these ignored files now, but we will be
talking about them later on during the articles.

## pnpm workspaces

I've mentioned workspaces a few times here and there, but what that actually
means? Well, this means that our package manager, in this case pnpm, provides a
way of having multiple packages under the same top-level, root package.

This feature allows us to have isolated apps and libraries under their own
directories and at the same time, we can link them just like any other
dependency out there and pnpm knows when to use the version under our file
system or download it from a remote registry (e.g. npm).

This is one of the key features that allow us to have a single repository with
multiple, independent apps that truly feels native. No need to third-party tools
that can wire these packages out in weird ways. We will be learning how to use
this feature in practice here, but if you want to learn more about it, I
encourage you to read the
[pnpm workspaces documentation page](https://pnpm.io/workspaces) for more
insights.

### Declaring our workspaces

pnpm requires a way of declaring where it can find the packages we will be using
under our repo and for that to work, we need to create a `pnpm-workspace.yaml`
file at the root of our repo. So let's go ahead and do that:

```yml
packages:
  # all directories within 'packages'
  # are considered monorepo packages.
  - "packages/**"
```

This file tells pnpm that whatever directory created under `packages` will be
considered an independent package. It can be a React component library, a NextJS
app, an Express app or whatever you can build with TypeScript or JavaScript. It
doesn't matter.

Some folks prefer to split between libraries and apps like having core libraries
under the `packages` or `lib` directories and the Web apps under an `apps`
directory, but that is purely organization preference. There is no difference
for pnpm, as long as the workspaces are declared in the yaml file, everything
should work in the same way.

pnpm is now fully setup to support our web app, docs website and component
library. Let's go ahead now and create these new packages.

## Creating our Web app with NextJS

If you have been doing Web development for a while, chances are that you at
least have heard of [NextJS](https://nextjs.org/). It is a React framework truly
made for production. It supports server-side rendering, client-side rendering
and even fully static site generation (We will be using that for our docs site).

Our Web app will be a dummy online store. It won't have much functionality
because that is not the focus of this series, but it will be enough to should
how to get the entire setup done from development to production.

Let's go ahead and create our first package for our Web app with the following
command:

```shell
# create the packages directory. This is where all our packages go.
mkdir packages && cd packages
# Create a nextJS app using their CLI tool
pnpm create next-app --ts
```

The `next-app` CLI tool will ask you what name you want to give to this app. Go
ahead and enter `web`. This is going to bootstrap a NextJS app under
`packages/web` with everything we need to start coding. If everything worked
correctly, you should be able to start the nextJS dev server right away with the
following command:

```shell
# Still under `packages/web`
pnpm dev
```

Now go to `localhost:3000` on your browser. You should see the following starter
page:

![NextJS starter page](/assets/images/posts/2022-09-03-next-js-starter-page.png)

We are all set with our web app. Let's go ahead now and create our React
component library. But before moving on, make sure to stop the Next dev server
with <kbd>CTRL</kbd>+<kbd>C</kbd>.

Before moving on, go to `packages/web/package.json` and change the `name` field
from `web` to `@monorepo/web`.

## Creating our React Component library with Vite

Before [Vite](https://vitejs.dev/), creating a frontend app was very painful.
You would need to setup all your tooling from scratch, make sure that your
bundling steps were working correctly and a bunch of other things that would
drive you away from working on the library itself, forcing you to spend time
with configuration instead.

Vite resolves this problem with a nearly-zero configuration setup. You can start
working on your Frontend app from the moment you start your project with Vite
and you are ready to build and publish it to npm.

So we will be using Vite to bootstrap our React component library. Let's go
ahead and execute the following command:

```shell
# make sure that you are under `packages` first of you were still on
# your terminal session from the previous step.
cd ..
# Use the Vite CLI tool to boostrap our component library
pnpm create vite
# ✔ Project name: … ui
# ✔ Select a framework: › react
# ✔ Select a variant: › react-ts
```

This is going to ask you a few questions before generating the project. Make
sure to write `ui` for the project name, select `react` for the framework and
then `react-ts` for the variant.

Vite does not install the dependencies by default like NextJS does, so let's go
ahead and install them with:

```shell
pnpm install
```

The next step now is to change the package name. Go to
`packages/ui/package.json` and change the `name` field from `ui` to
`@monorepo/ui`.

### Configuring Vite to build a React component library

By default, Vite comes configured to build a client-side rendering React app,
but it can be easily changed to by a pure component library. Let's go ahead and
do that. The first thing we need is to install a few dependencies that we will
to make sure that our build output is the best it can be for our consumers,
which in our case it will be the `@monorepo/web` package.
