# bpaulino.com blog

![deploy](https://github.com/brunojppb/brunojppb.github.io/workflows/deploy/badge.svg?branch=master)

![Text saying Welcome to my digital garden and a picture of myself smiling](https://repository-images.githubusercontent.com/158101370/5540e200-5739-11eb-8232-7315b07197d0)

## Install dependencies

This blog is built with [Jekyll](https://jekyllrb.com/), a
[Ruby](https://www.ruby-lang.org/en/) based static site generator.  
Make sure you have [Ruby](https://www.ruby-lang.org/en/) 2.6 installed and run
the following commands:

```shell
# If bundler is not there yet, execute:
$ gem install bundler
# Now install all dependencies
$ bundle install
```

## Development and Running locally

Once you have all dependencies installed, you can run the local development
server with:

```shell
# That should kickstart the local dev server
# and make the site available on port 4000 by default for you
jekyll server
# This command should generate an output like this:
Auto-regeneration: enabled for '/the/repo/path/here'
  Server address: http://127.0.0.1:4000
  Server running... press ctrl-c to stop.
```

## Deployment with Cloudflare Pages 🎉

All commits to `master` will trigger an integration with
[Cloudflare Pages](https://pages.cloudflare.com/) where we cache and serve these
contents under my own domain.
