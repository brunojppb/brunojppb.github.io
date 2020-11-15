# bpaulino.com blog

![deploy](https://github.com/brunojppb/brunojppb.github.io/workflows/deploy/badge.svg?branch=master)

## Install dependencies

This blog is built with [Jekyll](https://jekyllrb.com/), a [Ruby](https://www.ruby-lang.org/en/) based static site generator.  
Make sure you have **Ruby 2.6** installed and run the following commands:

```shell
# If bundler is not there yet, execute:
$ gem install bundler
# Now install all dependencies
$ bundle install
```

## Development and Running locally

Once you have all dependencies installed, you can run the local development server with:

```shell
# That should kickstart the local dev server
# and make the site available on port 4000 by default for you
jekyll server
# This command should generate an output like this:
Auto-regeneration: enabled for '/the/repo/path/here'
  Server address: http://127.0.0.1:4000
  Server running... press ctrl-c to stop.
```


## Now with Github Actions 🎉
All commits to `master` will trigger the `deploy` workflow and will generate the static files and deploy automatically to the `gh-pages` branch.

