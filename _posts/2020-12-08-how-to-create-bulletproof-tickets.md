---
layout: post
author: Bruno Paulino
title: How to Create Bulletproof Tickets
permalink: entries/how-to-create-bulletproof-tickets
keywords: ticket,agile,productivity,web,dev
meta_description:
  A step-by-step guide on how to create meaningful tickets that save time for
  you and your team.
meta_image: /assets/images/posts/2020-12-08-how-to-create-bulletproof-tickets.jpg
---

It's Monday morning, you just had your first coffee in front of the computer and
you open your project management app to start planning your week with your team.
You start reading your backlog of tasks and then you see a ticket with the
title:

> [BUG] Button doesn't respond

You open the ticket and for your astonishment, the description is empty, there
are no screenshots, no urls, _nada_. You can only see that this ticket was
created by Joe. You immediately start to think _"Ho dear Joe, what did you see?
on which page did you see this button? Which button specifically doesn't
respond? Was it happening constantly, was it intermittent, was it you who found
this issue? Can you reproduce?"_ So many questions you want to ask Joe, but so
little time.

If you have never had a similar situation like I mentioned before while working
on a project with multiple people, you can consider yourself the luckiest person
on the planet. The truth is, you have to put a good deal of thought and time
into creating a great ticket. Reporting a bug or defining a requirement well is
a kind of art.

Whenever you are in a position of reporting something in written form, in this
case creating a ticket, you have to put yourself in the shoes of the other
person that will read and work on it.

## Why is creating good tickets so important?

At first sight, it seems like a time consuming task, and to be completely
honest, it does take time to create a good ticket. But what we often miss is the
time we save by avoiding roundtrips of questions that could have been answered
during the ticket creation in the first place. Here are some reasons why
creating a meaningful ticket is important:

- **It saves time:** People don't have to run around to gather the information
  that is already there.
- **More understanding:** A well written ticket helps to give more understanding
  about the problem that might be hard to track down.
- **Solid solutions:** The more you understand the problem, the better and more
  reliable the solution will be. And the understanding usually starts by reading
  the ticket.
- **Less frustration:** Once the context is well detailed and understood, the
  people that will work on the problem will have less ambiguous questions to ask
  which will reduce the cognitive load while reasoning about a solution.

You might be thinking _"Okay Bruno, but how the heck do I know whether a ticket
is good or not?"_. I'm Glad you asked and this is a super valid question by the
way. After dealing with hundreds of tickets along the years, I have got an
interesting method that I want to share with you in the next section.

## The Method

There is zero scientific evidence to back me up here, but what I noticed was
that I could use some small principles to have a well defined method to create
good tickets. So based on what we have seen up until this point, here are the
steps we can take to create good tickets:

- **Set the stage**: Explain the context and the impact the problem has.
- **How to reproduce**: If the ticket is related to a bug, here you provide
  detailed information on how to recreate the problem in a consistent way.
- **Offer Solutions**: If you are able to, offer potential solutions for the
  problem you just found.

In the following sections, I will construct a fictional ticket (but based on
real world examples of web projects) so you can have a decent example on how you
could apply those steps.

## Set the stage

Let's imagine you have just found a bug on the website from the company you work
with. Now you need to report the problem and hopefully someone will fix it as
quickly as possible. How do you start explaining the problem to someone that you
might not even know?

To start things off, you need to give as much information as possible about the
context of the bug. And what do I mean by context? Here the important thing is
to explain in detail what you expect in a normal case and what the bug
introduces. But don't be too verbose on it otherwise you leave a lot of room for
ambiguity. Here is an example:

> With the introduction of the new product versions, we changed the URLs our
> customers see on our public website. This causes several problems with
> external tools that rely on the previous URLs (e.g. Marketing Campaigns).
>
> The basic premises of existing product URLs are:
>
> - The customer must have a stable URL for any published product
> - It should never change for the same product in the eyes of the customer
> - With an immutable URL none of our marketing campaigns running on our Ad
>   platforms would stop working.

In the example above, we have given a good overview of the problem and also a
good reason for the problem to be solved. This is a good starting point for a
discussion about the ticket and also helps to prioritize it during planning.

## How to Reproduce

Now that we have set up a good context by explaining the problem in detail and
why it is important to fix it, it's time to write down the steps to reproduce
it. In software development, debugging can be a challenging task and the more
clues you have, the easier it gets to find and fix the problem. One part of the
puzzle is to consistently reproduce the problem in a safe environment so it can
be monitored, tracked down and fixed. For that to happen, you usually have to
define a set of steps that lead to the problem you found. Here is an example
following our fictional problem above:

> To reproduce the problem, please follow the steps below:
>
> - Open an existing product in the admin interface
> - Open the product preview and write down the current URL
> - Go back to the admin interface and update the product reference for a new
>   version of the same product
> - save the changes
> - Open the product preview again on the website
> - Compare the new URL with the previous URL you saved
>
> The comparison will result in an URL mismatch.

With the clear steps mentioned above, anyone who gets assigned to work on this
ticket will quickly manage to verify the problem and test it as many times as
they need.

Sometimes you won't be able to have a consistent way of reproducing the problem
and that is fine too, but try to find as many reproducible steps as possible.
This will save a good chunk of time for the development team which leads to a
faster bug-fix being deployed.

## Offer Solutions

The cherry on top, if you have more understanding of the systems you are
reporting the bug, is to offer potential solutions for the problem you just
found. Developers like challenges, but nobody has infinite time and at the end
of the day, we have to produce value for the business, so the quicker a problem
can be solved, the better.

in some cases, you might even know exactly what the problem is and how to fix
it, so don't spare words into giving a more detailed and technical suggestion at
this stage. Here is how I would suggest a solution for our fictional URL problem
we have been creating:

> It looks like this problem happens at the e-commerce platform level. Since
> this is a third-party application which we don't have access to the source
> code, we have to fix this problem on another layer of our system.
>
> A potential solution could be to set rules on our reverse proxy so we keep
> accepting requests from old URLs and map them to the new ones. In the
> meantime, I will also report this problem to our e-commerce provider.

It is clear that in the example above, the author has a deeper understanding of
what is happening in the internal systems and that is a big advantage. But if
you don't have this level of insight, you can still provide good feedback on how
to solve the problem. Any potential solution should be considered, especially if
that is coming from someone that understands the problem.

## Wrapping up

I have been following those principles for a long time and it actually became
quite natural for me while creating a ticket, but I understand that it takes
time to build up this understanding.

Sometimes your ticket will still leave room for questions and clarifications,
and that is fine too. As long as your ticket was well prepared, even those
follow-up questions will be more meaningful and complete, leading to less
frustration and a more fluid communication path with your team.

I believe by now you have the superpowers to create bulletproof tickets 🦸🏼‍♀️. Here
is the complete ticket we created during this blogpost:

> **Subject**
>
> Product URL breaks after updating product version reference.
>
> **Problem**
>
> With the introduction of the new Product versions, we changed the URLs our
> customers see on our public website. This causes several problems with
> external tools that rely on the previous URLs (e.g. Marketing Campaigns).
>
> The basic premises of existing product URLs are:
>
> - The customer must have a stable URL for any published product
> - It should never change for the same product in the eyes of the customer
> - With an immutable URL, none of our marketing campaigns running on our Ad
>   platforms would stop working.
>
> **How to Reproduce**
>
> To reproduce the problem, please follow the steps below:
>
> - Open an existing product in the admin interface
> - Open the product preview and write down the current URL
> - Go back to the admin interface and update the product reference for a new
>   model
> - Save the changes
> - Open the product preview on the website
> - Compare the new URL with the previous URL you saved
>
> The comparison will result in an URL mismatch.
>
> **Potential Solution**
>
> It looks like this problem happens at the e-commerce platform level. Since
> this is a third-party application which we don't have access to the source
> code, we have to fix this problem on another layer of our system.
>
> A potential solution could be to set rules on our reverse proxy so we keep
> accepting requests from old URLs and map them to the new ones. In the
> meantime, I will also report this problem to our e-commerce provider.
