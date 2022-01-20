---
layout: post
author: Bruno Paulino
title: Modern Webapps with React, Phoenix, Elixir and TypeScript
permalink: entries/modern-webapps-with-elixir-phoenix-typescript-react
keywords: elixir,phoenix,typescript,react,webapp
meta_description: How to create a modern Phoenix app with React and TypeScript
meta_image: /assets/images/posts/elixir-phoenix-typescript-react.jpg
---

I've started working on a side project this year and the tech stack
I have chosen was the [Elixir lang](https://elixir-lang.org/) due to its functional
design and fault tolerance (Thanks to the [Erlang VM](https://www.erlang.org/)) so
the [Phoenix framework](https://www.phoenixframework.org/) was a natural choice for me.

While Phoenix provides a very interesting programming model called [LiveView](https://hexdocs.pm/phoenix_live_view/Phoenix.LiveView.html), I wanted to stick with the frontend
stack I'm most familiar with which is [React](https://reactjs.org/).
Besides using it heavily in my day job, I also really appreciate the ecosystem around it.

I wanted to come up with a solid Phoenix project where I can get all the benefits
from Elixir and Phoenix itself, but also be flexible enough by not coupling my React frontend
with Phoenix. My requirements were:

* Be able to use [Hot Module Replacement](https://webpack.js.org/concepts/hot-module-replacement/) during frontend development.
* Run the React frontend in a separate process from the Phoenix app
* During development, changes on the React frontend do not trigger the elixir compiler
* During development, changes on the Phoenix app do not trigger frontend recompilation
* [CORS](https://developer.mozilla.org/pt-BR/docs/Web/HTTP/CORS). I don't want to think about it. It's a no-brainer if we bundle all our apps together under the same domain.
* In production, serve the React frontend under the `/app/*` path from Phoenix
* In production, all other routes should be server-rendered, so we can still benefit from serve-side rendering for specific cases like better SEO and dynamic landing pages with a smart [caching strategy via Cloudflare](https://developers.cloudflare.com/cache/about/cache-control) using `stale-while-revalidate` headers.

With the clear requirements defined above, I managed to make them all work by combining
Phoenix and [Vite](https://vitejs.dev/). So let's get our hands dirty, write some code and
make this project work!

> This guide assumes that you are already familiar with Elixir, Phoenix and a frontend
> framework like React, so we skip a few basic concepts and jump straight in. Although,
> I will be linking some important resources to guide you in case you are just 
> starting with this stack.

## Creating our Phoenix project

First of, make sure you have the following dependencies installed:

1. Elixir: [installation guide here](https://elixir-lang.org/install.html)
2. Phoenix: [installation guide here](https://hexdocs.pm/phoenix/installation.html)
3. NodeJS 16 or above: [installation guide here using NVM](https://github.com/nvm-sh/nvm#installing-and-updating)
4. PostgreSQL: [Download here](https://www.postgresql.org/download/)

Now let's head to our terminal and create our Phoenix app:

```shell
mix phx.new phoenix_react 
```

Once your project is react, `cd` into it and fire up the Phoenix server:

```shell
cd phoenix_react
# Make sure the Postgres database is available for Ecto
mix ecto.create
# Start the dev server
mix phx.server
```

Now you should be able to access your Phoenix app at `localhost:4000` and
see a page like the following:

![Phoenix App](/assets/images/posts/phoenix_web_app.png)

Awesome! We have got our Phoenix app up and running. Let's bootstrap our React
app in an independent directory.

## Creating our React with TypeScript project

For our React frontend, I've chosen [Vite](https://vitejs.dev/) to handle all the tooling for me.
It has got all the sane defaults I need for a TypeScript project with React, plus
it uses [ESBuild](https://esbuild.github.io/) which gives us blazing fast
feedback during development.

To kick things off, leave the Phoenix server running and open up a new terminal window.
Still within the Phoenix directory in your terminal, let's use the Vite CLI
to create our React project:

```shell
npm init vite@latest frontend -- --template react-ts
```

This should create our React project under the `frontend` directory. Let's install
all dependencies and start our Vite dev server:

```shell
cd frontend
npm install
npm run dev
```

Now head to your browser at `localhost:3000`, you should see our React app up and running!

![React App](/assets/images/posts/react_ts_vite_app.png)

## Adding routes to our React app

There is a major difference between Phoenix routes and React routes:

* Phoenix routes are mapped to a request to the server, which results in a new template
rendering which results in the whole browser to reload.
* React routes are client-side only, which means that navigating from `/app/settings`
to `/app/profile` in our React app doesn't mean a new request to the server.
It might just mount a new component instantly which might not need server data at all.

So the strategy here is to leverage [React Router](https://reactrouter.com/)
on our React app for any route that is under `/app` and whenever the client
makes the first request to our app, let's say they are visiting `example.com/app`
for the first time, Phoenix will handle this initial request and serve the
initial HTML together with our React app payload, so the React app can be
mounted and take care of the routing from there.

To make sure that client-side route changes are working, let's add a very basic
routing component so we can test if our react app is working. Let's start by installing
React Router in our React app. Stop the dev server and execute the following:

```shell
npm install react-router-dom@6
```

Now open up your favorite text editor and edit our React app file at `phoenix_react/frontend/src/App.tsx`
with the following components:

```tsx
import { useEffect } from 'react';
import { BrowserRouter, Link, Routes, Route } from 'react-router-dom';

const style = {display: 'flex', gap: '8px', padding: '8px'}

function App() {

  /**
   * During development we can still access the base path at `/`
   * And this hook will make sure that we land on the base `/app`
   * path which will mount our App as usual.
   * In production, Phoenix makes sure that the `/app` route is
   * always mounted within the first request.
   * */
  useEffect(() => {
    if (window.location.pathname === '/') {
      window.location.replace('/app');
    }
  }, []);

  return (
    <BrowserRouter basename="app">
      <nav style={style}>
        <Link to="/">Home</Link>
        <Link to="/settings">Settings Page</Link><br/>
      </nav>
      <Routes>
        <Route path="/" element={<HomePage/>}/>
        <Route path="settings" element={<SettingsPage/>}/>
      </Routes>
    </BrowserRouter>
  );
}

function SettingsPage() {
  return(
    <div>
      <h1>Settings Page</h1>
      <ul>
        <li>My profile</li>
        <li>Music</li>
        <li>About</li>
      </ul>
    </div>
  );
}

function HomePage() {
  const style = {padding: '8px'}
  return(
    <div style={style}>
      <h1>React TS Home</h1>
      <p>Welcome to the homepage</p>
    </div>
  );
}

export default App;
```

Now you should be able to visit `localhost:3000/app` and see a screen similar to
the following:

![React app with routes](/assets/images/posts/react_router_app.png)

Try to click around the `Home` and `Settings Page` links at the top. Notice that
it transitions between pages instantly. If you check your Phoenix console, you notice
that no requests have been fired to your backend. So far so good.

Also notice that we now access our React app via the `/app` route. This is important
and plays a major role when we bundle our application for production and serve it
from Phoenix. We are using a small hook to check whether our app was mounted to the `/` path
and redirect to the base path. This is only relevant for development. In production,
Phoenix will make sure that the user is always in the `/app` when using our React app.

## Serving our React frontend from Phoenix

So far, Phoenix has no clue about our React app. We need to come up with a way to
tell Phoenix how to serve our React app once it's bundled and ready to be served as
a SPA. For that to work, we can do the following:

1. Build our React app for production with Vite
2. Copy our production build to the `priv/static` folder so we can use [Plug.Static](https://hexdocs.pm/plug/Plug.Static.html) to serve our static assets
3. Make Phoenix aware about the `/app` route so our generated `index.html` from vite
can be statically served, which will trigger our React resources to be loaded.

### Creating a custom mix task to do the job

To manage point 1 and 2 from the previous section, we can create a custom [mix task](https://hexdocs.pm/mix/1.12/Mix.Task.html) that can execute all the TypeScript bundling via NPM and coping
files around to make our React app ready to be served by Phoenix.

Our custom mix task will make sure that:

* All of our frontend dependencies are installed
* build our frontend for production distribution
* Move the production files to `priv/static/webapp`

> The `/priv/static/webapp` path will be picked up by Phoenix later on, but make sure
> that you add it to your `.gitignore` file. We don't want to commit our frontend
> production bundles.

Let's go ahead and create `lib/mix/tasks/webapp.ex` with the following Elixir code:

```elixir
defmodule Mix.Tasks.Webapp do
  @moduledoc """
    React frontend compilation and bundling for production.
  """
  use Mix.Task
  require Logger
  # Path for the frontend static assets that are being served
  # from our Phoenix router when accessing /app/* for the first time
  @public_path "./priv/static/webapp"

  @shortdoc "Compile and bundle React frontend for production"
  def run(_) do
    Logger.info("📦 - Installing NPM packages")
    System.cmd("npm", ["install", "--quiet"], cd: "./frontend")

    Logger.info("⚙️  - Compiling React frontend")
    System.cmd("npm", ["run", "build"], cd: "./frontend")

    Logger.info("🚛 - Moving dist folder to Phoenix at #{@public_path}")
    # First clean up any stale files from previous builds if any
    System.cmd("rm", ["-rf", @public_path])
    System.cmd("cp", ["-R", "./frontend/dist", @public_path])

    Logger.info("⚛️  - React frontend ready.")
  end
end
```

Using the [System](https://hexdocs.pm/elixir/1.12/System.html) module, we can
interact directly with our host system, so we can issue shell commands when invoking
our custom mix task.

Let's try it out. Stop your Phoenix server and execute the following command:

```shell
mix webapp

# You should see an outout similar to the following:
15:48:13.605 [info]  📦 - Installing NPM packages
15:48:15.034 [info]  ⚙️  - Compiling React frontend
15:48:19.611 [info]  🚛 - Moving dist folder to ./priv/static/webapp
15:48:19.618 [info]  ⚛️  - React frontend ready.
```

Our frontend is ready to be served by Phoenix now. But there is one little change
we have to make to our Vite configuration so our Frontend static assets can be delivered.

## Making the webapp base path discoverable

By default, Phoenix serves static content from the `priv/static` directory using the base route `/`.
For instance, if we have a JPG file at `priv/static/assets/picture.jpg`, Phoenix will
make this resource available at `/assets/picture.jpg` to the public.

We want that to happen, but for our web app, static resources will be under the `/webapp/` path.
Luckily, this is extremely simple.

### Vite base path for production

Since we want to serve our Web app from `priv/static/webapp`, we have to make sure that during
our production build, Vite should append the `/webapp/` base path to all our resources.
This is paramount for our app to work.

Vite provides a specific configuration entry for that. Let's go ahead and edit
our `frontend/vite.config.ts` file with the following:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // using the `webapp` base path for production builds
  // So we can leverage Phoenix static assets plug to deliver
  // our React app directly from our final Elixir app,
  // Serving all files from the `priv/static/webapp` folder.
  // NOTE: Remember to move the frontend build files to the
  // `priv` folder during the application build process in CI
  // @ts-ignore
  base: process.env.NODE_ENV === 'production' ? '/webapp/' : '/',
})
```

Now execute our custom mix task again from within our Phoenix project:

```shell
mix webapp
```

Once this is done, take a look at the `priv/static/webapp/index.html` contents.
We should see an HTML similar to the following:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/webapp/assets/favicon.17e50649.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite App</title>
    <script type="module" crossorigin src="/webapp/assets/index.fb986a90.js"></script>
    <link rel="modulepreload" href="/webapp/assets/vendor.6b432119.js">
    <link rel="stylesheet" href="/webapp/assets/index.458f9883.css">
  </head>
  <body>
    <div id="root"></div>
    
  </body>
</html>
```

Notice that all URLs there have the `/webapp/` base path prepended. That is very neat.
Our Frontend is ready to be served by Phoenix.

### Serving static assets via Plug

Phoenix is still unaware of our `webapp` static folder. We must add that to our
endpoint configuration so our `Plug.Static` can serve it. Head to `lib/phoenix_react_web/endpoint.ex`
at line 23. Add the `webapp` to the string list:

```elixir
plug Plug.Static,
    at: "/",
    from: :phoenix_react,
    gzip: false,
    only: ~w(assets fonts images webapp favicon.ico robots.txt)
```

With that tiny change, Phoenix is now able to serve the static assets generated by Vite.

### Serving the initial HTML page via Phoenix

We now have a fully functional frontend and our Phoenix backend is able to deliver its
static assets like JavaScript and CSS files. But to make it really feel native to our
platform, we must be able to visit `example.com/app` or any other route under `/app`
and our React app must be able to mount all its components based on the given route.

For that to work, we must deliver the initial `index.html` that was generated by Vite
whenever someone visits `/app/*`. We need a custom Phoenix controller. Let's build that now.

Create a new controller at `lib/phoenix_react_web/controllers/webapp_controller.ex`
with the following module:

```elixir
defmodule PhoenixReactWeb.WebappController do
  use PhoenixReactWeb, :controller

  def index(conn, _params) do
    conn
    |> send_resp(200, render_react_app())
  end

  # Serve the index.html file as-is and let React
  # take care of the rendering and client-side rounting.
  #
  # Potential improvement: Cache the file contents here
  # in an ETS table so we don't read from the disk for every request.
  defp render_react_app() do
    Application.app_dir(:phoenix_react, "priv/static/webapp/index.html")
    |> File.read!()
  end
end
```

We now have a controller that can serve our `index.html` file, but we need
to configure a route that will hit this newly created `index` function.
Let's add the following scope to our Phoenix router:

```elixir
scope "/app", PhoenixReactWeb do
  get "/", WebappController, :index
  get "/*path", WebappController, :index
end
```

Awesome! Let's try this out. Make sure that your Vite dev server is stopped and
start your Phoenix server with `mix phx.server` and go to `localhost:4000/app`.
You should see the exact same result that we had when our Vite dev server was running!

Try to click through the header links. It should be all client-side routing.
The ultimate test is to type in the url `localhost:4000/app/settings`, hit enter
and see what happens.

Notice that the `/app/settings` page will be displayed as we expected. Behind the scenes,
Phoenix kept delivering the `index.html` file and the React Router made sure that the
right components were mounted. Sweet! Our Phoenix and React apps are ready to roll!

### API requests and CORS

If you have been developing frontend apps that talk to an external API, I'm quite
confident that you have faced a bunch of CORS issues. For those that are not familiar with,
whenever you open up an app at `myapp.com` and that same app needs to call an API
at `myapi.com` the browser prevents that by default.

Actually, the browser will issue an `OPTIONS` request to check if `myapi.com` allows
requests coming from `myapp.com` to be answered. This is a very interesting security
mechanism and I'm glad it's there. If you want to learn more about it, [Jake Archibald](https://twitter.com/jaffathecake)
wrote [an awesome blogpost](https://jakearchibald.com/2021/cors/) about it with all the information you need to know.

#### Skipping the whole CORS trouble

Whenever we are developing an app that it's all hosted under the same domain, things
are way easier and simpler. If our `myapp.com` makes a request to `myapp.com/api/users`
the browser won't even think about checking that because it knows that `myapp.com` is under 
the same domain, so it's pretty sure that you allow requests to come and go from your own domain.

During development, we are running our Phoenix app at port `4000` and our React app
at port `3000`, we need to find a way for requests made by our React app to `localhost:3000/api/users`
to be captured by some sort of proxy and forwarded to our Phoenix backend at port `4000`.

Luckily, Vite saves the day again by providing us with the server proxy configuration.
Head over to the `frontend/vite.config.ts` and add the `server` entry to your config:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Forward all requests made by our React frontend to `localhost:3000/api`
  // to our Phoenix backend running at `localhost:4000`.
  // This is only necessary during development.
  // In production, our Phoenix and React apps are served from the same
  // domain and port, which makes this configuration unecessary.
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        secure: false,
        ws: true,
      },
    }
  },
  // using the `webapp` base path for production builds
  // So we can leverage Phoenix static assets plug to deliver
  // our React app directly from our final Elixir app,
  // Serving all files from the `priv/static/webapp` folder.
  // NOTE: Remember to move the frontend build files to the
  // `priv` folder during the application build process in CI
  // @ts-ignore
  base: process.env.NODE_ENV === 'production' ? '/webapp/' : '/',
})
```

From now on, if you are making requests with [axios](https://github.com/axios/axios) for instance,
you can safely make a request in your React component like this:

```jsx
import {useState, useEffect} from 'react';
import axios from 'axios';

export function RequestComponent() {

  const [todos, setTodos] = useState([]);

  useEffect(() => {
    axios.get('/api/todos').then(response => {
      const { todos } = response.data;
      setTodos(todos)
    });
  }, []);

  return(
    <div>
      { 
        todos.map(t => <span key={t.id}>{t.content}</span>) 
      }
    </div>
  )

}
```

The request to `/api/todos` should be forwarded to your Phoenix backend
and as long as you have a route and a controller to respond to that,
API requests will be served just fine.

Authentication via http-only Cookies will also just work without any extra
setup since everything is under the same domain. (`localhost` during development
and `myapp.com` in production)

## Creating an Elixir Release

We have got everything setup now and the cherry on top is to generate the Elixir
release with our production Phoenix app.

The major advantage of an Elixir Release is that it creates a single package including
the Erlang VM, Elixir and all of your code and dependencies. The generated package
can be placed into any machine without any preconfigured dependency. It works similarly
like Go binaries that you just download and execute.

But before we generate our release, since we are testing the build locally,
we need change the port configuration since our runtime configuration is
binding to __443__ by default. Let's quickly change that at `config/runtime.exs`:

```elixir
config :phoenix_react, PhoenixReactWeb.Endpoint,
  # here use the `port` variable so we can control that with environment variables
  url: [host: host, port: port],
  # Enable the web server
  server: true,
  http: [
    ip: {0, 0, 0, 0, 0, 0, 0, 0},
    port: port
  ],
  secret_key_base: secret_key_base
```

With that out of the way, execute the following commands to generate the release:

```shell
# Generate a secret for our Phoenix app
mix phx.gen.secret
# It will output a very long string. Something like this:
B41pUFgfTJeEUpt+6TwSkbrxlAb9uibgIemaYbm1Oq+XdZ3Q96LcaW9sarbGfMhy

# Now export this secret as a environment variable:
export SECRET_KEY_BASE=B41pUFgfTJeEUpt+6TwSkbrxlAb9uibgIemaYbm1Oq+XdZ3Q96LcaW9sarbGfMhy

# Export the database URL
# Probably very different in production for you.
# I'm just using the local postgreSQL dev instance for this demo
export DATABASE_URL=ecto://postgres:postgres@localhost/phoenix_react_dev

# Get production dependencies
mix deps.get --only prod

# Compile the project for production
MIX_ENV=prod mix compile

# Generate static assets in case you
# are using Phoenix default assets pipelines
# For serve-side rendered pages
MIX_ENV=prod mix assets.deploy

# Generate our React frontend using
# our custom mix task
mix webapp

# Genereate the convenience scripts to assist
# Phoenix applicaiton deployments like running ecto migrations
mix phx.gen.release

# Now we are ready to generate the Elixir Release
MIX_ENV=prod mix release
```

We now have our production release ready. Let's fire it up with the following command:

```shell
PHX_HOST=localhost _build/prod/rel/phoenix_react/bin/phoenix_react start

# You should an output similar to the following
19:52:53.813 [info] Running PhoenixReactWeb.Endpoint with cowboy 2.9.0 at :::4000 (http)
19:52:53.814 [info] Access PhoenixReactWeb.Endpoint at http://localhost:4000
```

Great! Now our Phoenix app is running in production mode. Now head to your browser
and open `localhost:4000/app`. You should see our React app being rendered!

We have finally succeeded with our Phoenix + React + TypeScript setup. It provides us
with a great developer experience while simplifying our production builds by
bundling our Phoenix app together with our React app.

## Wrapping up

While that might have been a tiny bit complex to setup, I believe it is still worth it
to keep your SPA decoupled from your backend. Here is a list with a few bonus point
of this setup:

* A single repo to work with which simplifies development, specially with a bigger team
* Simpler CI/CD pipelines on the same repository
* Free to swap out Vite in the future in case we decide to go with a different build tool
* In the extreme case of changing our backend from Phoenix to something else,
our React frontend is still fully independent and can basically be copy-pasted
into a new setup.

I personally believe that the development and deployment of our applications should
be simple and while having React as a dependency does increase complexity into our app,
the trade-off of building web apps with it pays off in my case. Although, if you
have simple CRUD apps, sticking with vanilla Phoenix templates and LiveView might
be more than enough.
