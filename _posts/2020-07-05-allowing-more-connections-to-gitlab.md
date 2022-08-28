---
layout: post
author: Bruno Paulino
title: Fine tuning self-hosted Gitlab server to solve SSH scaling problems
permalink: entries/allowing-more-connections-on-self-hosted-gitlab
keywords: gitlab,ssh,devops,server
meta_description:
  How to fine tune your Gitlab server to solve SSH connection issues.
meta_image: /assets/images/posts/fine_tuning_self_hosted_gitlab.jpg
---

At my current job, we have a self-hosted [Giltab](https://gitlab.com/) instance
to control our codebases and run automation jobs. If you don't know what Gitlab
is, you probably know [Github](https://github.com/) which is a platform to work
in collaboration with software teams using [Git](https://git-scm.com/) for
version control.

We recently onboarded a new partner to support us with our
[ERP system](https://github.com/odoo/odoo). We are working together to improve
our current deployment pipeline and make it more resilient and robust. We use
[Gitlab CI](https://docs.gitlab.com/ee/ci/) to automate our workflows and make
our codebase more reliable.

After setting up [more runners](https://docs.gitlab.com/runner/), we noticed
something strange happening randomly and quite frequently during our CI builds.
While fetching more repositories, some builds were failing with the following
message:

```txt
fatal: Could not read from remote repository.
Please make sure you have the correct access rights
and the repository exists.
```

Humm, that seems strange. Our runners have the correct access rights to the
repositories. Also, this error was happening randomly for different repositories
that was clearly working during other exact same builds.

With this information at hand, we started off the debugging journey. We started
monitoring the system and checking the server logs. Everything seemed normal.
There was nothing draining our resources to the point where our server would
start dropping connections.

## SSH Load Balancing and MaxStartups

Discussing the issue among my smart teammates, we couldn't see a reason for
Gitlab itself to be dropping connections with the amount of workload. There
could be some configuration with our [OpenSSH](https://www.openssh.com/)
defaults that might be responsible for that. And we indeed found one.

OpenSSH has this neat setting called `MaxStartups` which is composed by 3 values
separated by columns represented as `start:rate:full`. They mean:

- `start`: The max number of unauthenticated connections
- `rate`: The percentage of connections that will be dropped once our total of
  unauthenticated connections reaches the number specified at **start**.
- `full`: By the time the queue of pending connections reaches the number
  specified at **full**, all connections will be dropped.

If you look at `/etc/ssh/sshd_config`, the SSH configuration file, you will see:

```toml
MaxStartups 10:30:100
```

This configuration means: starting with `10` pending to authenticate
connections, our server will start dropping `30%` of new connection attempts.
Once our queue of pending connections reaches `100`, all new connections will be
dropped with no mercy.

After understanding how MaxStartups works, we looked again at our runners and we
noticed that some jobs were fetching 10 different repositories in parallel
during the build and aggregating them to build a
[Docker image](<https://en.wikipedia.org/wiki/Docker_(software)>). We were
really playing the dice when running those builds 😅.

With that in mind, we tweaked MaxStartups with the following values:

```toml
MaxStartups 60:60:300
```

After that, just restart our SSH daemon with:

```shell
systemctl restart ssh.service
```

We could see that the MaxStartups change instantly fixed the issue. Our builds
were flying again with zero connection drops. The new settings allowed us
greater leeway to connect to our server simultaneously, reducing the risk of
dropped connections.

## Defaults can only take you so far

The default settings were more than enough for us to start using
[Gitlab with its Omnibus package](https://docs.gitlab.com/omnibus/). I didn't
even know about those SSH settings to begin with, but once you start hitting
scaling problems, there is usually a escape hatch that can help you to leverage
the same resources to a much greater usage scenario.

Only after fixing the issue that I found Gitlab themselves had the exact same
issue.
[They wrote a great blog post about it.](https://about.gitlab.com/blog/2019/08/27/tyranny-of-the-clock/)
