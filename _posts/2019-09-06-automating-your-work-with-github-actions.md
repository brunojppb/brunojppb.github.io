---
layout: post
author: Bruno Paulino
title: Automating your work with Github Actions
permalink: entries/10-automating-your-work-with-github-actions
keywords: github,actions,automation,workflow,jekyll,git,blog,programming
meta_description: How to automate your workflow using Github Actions. In this case, my blog deployment :-)
---

I have finally joined the [Github Actions](https://github.com/features/actions) beta program this week and figured why not play with it for a bit and see what I can do. So my first idea was to automate the deployment process of my blog, this one you are currently reading. I am currently using [Jekyll](https://jekyllrb.com/) as my static site generator. It works flawless for what I need. I just write whatever I want using [Markdown](https://daringfireball.net/projects/markdown/) and Jekyll digests everything inside my source folder and spits out HTML, CSS and JS files in a **"ready-to-publish"** folder where I can just upload to the cloud.
  
I am currently using [Github Pages](https://pages.github.com/) to host my blog and it has been working perfectly fine for the past couple years.

## But how does a Github Action work anyway?
Github Actions is a way to perform tasks automatically for you. To give you an example, I will use my blog workflow.  
It all starts when I want to write a new post. I just create a new markdown file, write down whatever is on my head and save it. After this whole process, I need a way to transform my text in a website. Jekyll is doing the heavy-lifting for me, so I just go to my terminal and type:
```shell
# This command will generate my entire website and all its dependencies
jekyll build
```
After generating all the necessary files, I need to upload it somewhere. In this case, I just have to commit my changes to a specific branch called **gh-pages** and Github will serve my site on the web. For doing that, I usually perform the following commands in a bash script:
```shell
# This is the folder Jekyll generates with my website. Lets just open it
cd _site
# Now we need a new git repository here, 
# so I can commit only the generated files and skip the source files
git init
git config user.name "Bruno Paulino"
git config user.email "bruno@bpaulino.com"
git add .
# That will create a nice commit message with something like: 
# New Build - Fri Sep 6 12:32:22 UTC 2019
git commit -m "New Build - $(date)"
# Now lets push my commit to the gh-pages branch and replace everything there
REPO=https://brunojppb@github.com/brunojppb.github.io.git
git push --force $REPO master:gh-pages
# Lets do some cleanup here since we don't need the generated files anymore
rm -fr .git
cd ..
rm -rf _site
```

That is pretty simple right? It is indeed, but how cool would that be if Github could do that for me instead? That is where Github Actions come to give us a hand.  
  
It all starts with a folder on your repository called `.github/workflows`.  
inside of this folder, create a file called `deploy-workflow.yml` with the content below. Each line will be explained with a comment:

### deploy-workflow.yml
```yaml
# This is the name of our workflow.
# Github will show it on its Website UI
name: deploy
# This configures our workflow to be triggered
# only when we push to the master branch
on:
  push:
    branches:
      - master

# Here is where we define our jobs. 
# Which means the tasks we want Github to execute
jobs:
  build:
    name: deploy
    # Here we specify in whith OS we want it to run
    runs-on: ubuntu-18.04
    # Now we define which actions will take place.
    # One after another
    steps:
      # This is the first action. It will make sure that we have
      # all the necessary files from our repo, including our custom actions
      # This action here is actually from a remote repo available from Githup itself
      - uses: actions/checkout@v1 
      # This is our custom action. Here is where we will define our git commands
      # to push our website updates to the `gh-pages` branch.
      # Notice that we are specifying the path to the action here.
      # We will create those files in a sec
      - uses: ./.github/actions/build-dist-site
        env:
          # Now make sure you add this environment variable.
          # This token will allow us to push to github directly
          # without having to type in our password.
          # The GITHUB_TOKEN is available by default
          GITHUB_TOKEN: {{ "${{ secrets.GITHUB_TOKEN"}} }}
```

Now lets create our custom action. [Github Actions are divided in 2 types](https://help.github.com/en/articles/about-actions#types-of-github-actions):
- Docker container
- Javascript

We are running our action using a Docker Container. Using Docker, we make sure the environment where our scripts are running will be the same, no matter what happens to the Github environment. So, lets dig deeper and create our `actions` folder under `.github`.
```shell
# build-dist-site will be the folder for holding
# our action configuration (Dockerfile, scripts and Metadata)
mkdir -p .github/actions/build-dist-site
``` 
  
Under `.github/actions/build-dist-site` lets create 3 files:
- `action.yml`: It will hold the metadata of our action
- `Dockerfile:` Will specify our Docker image to run Jekyll in a container
- `entrypoint.sh:` Will have our custom scripts to generate and deploy our website update

### Dockerfile
```dockerfile
# Our Docker image will be based on ruby:2-slim
# it is a very light docker image.
FROM ruby:2-slim
LABEL author="Bruno Paulino"
LABEL version="1.0.0"

# Lets install all dependencies
# including git and Bundler 2.0.2
ENV BUNDLER_VERSION 2.0.2
RUN apt-get update && \
    apt-get install --no-install-recommends -y \
        bats \
        build-essential \
        ca-certificates \
        curl \
        libffi6 \
        make \
        shellcheck \
        libffi6 \
        git-all \
    && gem install bundler:2.0.2 \
    && bundle config --global silence_root_warning 1

# This is our entrypoint to our custom scripts
# more about that in a sec
COPY entrypoint.sh /

# Use the entrypoint.sh file as the container entrypoint
# when Github executes our Docker container
ENTRYPOINT ["sh", "/entrypoint.sh"]
```

Now that we have our Dockerfile ready, we need to tell Github to use it. That is why we need the `action.yml` file.
### action.yml
```yaml
# Ok, here the keys are pretty much self explanatory :)
name: 'Deploy new version'
description: 'Setup Ruby env and build new site version'
author: 'Bruno Paulino'
runs:
  using: 'docker'
  image: 'Dockerfile'
```

The `action.yml` file tells Github what to do. In this case, just tell it to use Docker and use our `Dockerfile` to build the container with it.
  
Now we just need our `entrypoint.sh` script to execute our website generation and deployment. Lets get our hands dirty with a bit of bash script:

### entrypoint.sh
```shell
#!/bin/bash
# Exit immediately if a pipeline returns a non-zero status.
set -e

echo "🚀 Starting deployment action"

# Here we are using the variables
# - GITHUB_ACTOR: It is already made available for us by Github. It is the username of whom triggered the action
# - GITHUB_TOKEN: That one was intentionally injected by us in our workflow file.
# Creating the repository URL in this way will allow us to `git push` without providing a password
# All thanks to the GITHUB_TOKEN that will grant us access to the repository
REMOTE_REPO="https://${GITHUB_ACTOR}:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"

# We need to clone the repo here.
# Remember, our Docker container is practically pristine at this point
git clone $REMOTE_REPO repo
cd repo

# Install all of our dependencies inside the container
# based on the git repository Gemfile
echo "⚡️ Installing project dependencies..."
bundle install

# Build the website using Jekyll
echo "🏋️ Building website..."
JEKYLL_ENV=production bundle exec jekyll build
echo "Jekyll build done"

# Now lets go to the generated folder by Jekyll
# and perform everything else from there
cd _site

echo "☁️ Publishing website"

# We don't need the README.md file on this branch
rm -f README.md

# Now we init a new git repository inside _site
# So we can perform a commit
git init
git config user.name "${GITHUB_ACTOR}"
git config user.email "${GITHUB_ACTOR}@users.noreply.github.com"
git add .
# That will create a nice commit message with something like: 
# Github Actions - Fri Sep 6 12:32:22 UTC 2019
git commit -m "Github Actions - $(date)"
echo "Build branch ready to go. Pushing to Github..."
# Force push this update to our gh-pages
git push --force $REMOTE_REPO master:gh-pages
# Now everything is ready.
# Lets just be a good citizen and clean-up after ourselves
rm -fr .git
cd ..
rm -rf repo
echo "🎉 New version deployed 🎊"
```

🤯 That was a lot different from what I started with right? Ok, the reason for that is just Docker. Now we have a more robust implementation of our deployment pipeline where we could even move away from Github to Gitlab and reuse the Dockerfile and entrypoint.sh (with minor changes).

Now that we are armed with those files, lets commit our changes and push to Github and see what happens. Going to our Github repository page, there you can see a new button called **Actions**:

![Github Actions button](/assets/images/github_actions_button.jpg)

Lets click on it. You will be taken to the **Workflows** list. There we see our **Deploy** workflow we just created.

![Github Actions button](/assets/images/github_workflows_running.jpg)

Now inside of our workflow execution context, we can see all of our actions being executed:

![Github Actions button](/assets/images/github_execution_pipeline.jpg)

Ok, now our automation work was fully done. As a cherry on top, you can also add a badge to your README.md file showing the current status of your custom actions like that:

```md
# Where /deploy/ must be replaced with your workflow name
![workflow-badge](https://github.com/brunojppb/brunojppb.github.io/workflows/deploy/badge.svg)
```

That will render a nice image automatically by Github on your repository page.
![Github Actions Badge](/assets/images/github_action_badge.jpg)

Now I can enjoy my time spent building and deploying my website doing something else like playing videogames 🎮 or drawing 🎨. Here is the open-source repository of my blog if you want to take a look:
[https://github.com/brunojppb/brunojppb.github.io](https://github.com/brunojppb/brunojppb.github.io)