---
layout: post
author: Bruno Paulino
title: "The TypeScript Monorepo Series: Creating our monorepo"
permalink: entries/typescript-monorepo-series-creating-our-monorepo
keywords: monorepo,typescript,javascript,turborepo,scale,teams,dx
meta_description: Creating our TypeScript monorepo from scratch
---

If you read
[the first article](/entries/typescript-monorepo-series-what-is-a-monorepo) of
this series, I assume that you are now interested in learning about monorepos
and how to create one. In this part, we will do just that: Create our TypeScript
monorepo from scratch, already including our Web app and our component library.

While we create our project from scratch, we will explore a few important
topics:

1. Package managers and why pnpm is a great choice
1. NodeJS versions and how to keep it in sync
1. Workspaces
1. Monorepo dependency management
