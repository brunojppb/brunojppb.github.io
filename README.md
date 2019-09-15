## bpaulino.com blog
![workflow-badge](https://github.com/brunojppb/brunojppb.github.io/workflows/deploy/badge.svg)

Install dependencies:
```sh
# If bundler is not there yet, execute:
$ gem install bundler
# Now install all dependencies
$ bundle install
```

## Now with Github Actions 🎉
All commits to `master` will trigger the `deploy` workflow and will generate the static files and deploy automatically to the `gh-pages` branch.

