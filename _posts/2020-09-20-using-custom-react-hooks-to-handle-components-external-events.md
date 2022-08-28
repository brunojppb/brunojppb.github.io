---
layout: post
author: Bruno Paulino
title: Using custom React hooks to handle components external events
permalink: entries/using-custom-react-hooks-to-handle-components-external-events
keywords: react,hooks,functional,components,frontend
meta_description:
  Creating a custom React hook for handling events outside of components like
  dismissing a modal.
meta_image: /assets/images/posts/2020-09-20-using-custom-react-hooks-to-handle-components-external-events.jpg
---

On a side project this weekend, I had the classic case for a modal
implementation. In most of the applications you have to deal with daily, you
come to a place where you have to confirm some action or review some changes
before pushing the _"I am 100% sure about this"_ button.

This is the perfect case for a modal, a small view that partially covers the
screen and presents you with a few options. Most of the time, there will be a
button to close the modal away by clicking on the "close" button on the
top-right corner. But an even better way to let the user dismiss the modal is to
let them click outside of the view in focus, without forcing them to hit the
often too small **"x"** on top.

Here is the live implementation of our modal component we will build during this
post. Try it out on our
[Codesandbox](https://codesandbox.io/s/small-browser-vosod?file=/src/Modal.js).

<iframe src="https://codesandbox.io/embed/react-custom-hooks-see0d?fontsize=14&hidenavigation=1&theme=dark&view=preview"
     style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;"
     title="react-custom-hooks"
     allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
     sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
   ></iframe>

For cases like this, you most probably want to watch for clicks or taps outside
the main view, in this case, the modal, so you can take the correct action of
closing it. But how could you do that in [React?](https://reactjs.org/) one way
would be to implement a global click handler in the component, something like
this:

```jsx
import React, { useRef, useEffect } from "react";

export default function Modal({ onClose, ...props }) {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleClick = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        // Here you can close your modal.
        // how to close it, that is up to you
        // (e.g. removing components, changing routes)
        // in this case, I am calling a `onClose` function
        // passed down as a prop.
        console.log("Click happened outside. you can close now.");
        onClose();
      }
    };

    // Pointer events are more device agnostic
    // which are able to handle clicks on Desktops and Taps on mobile devices
    // See: https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/pointerdown_event
    document.addEventListener("pointerdown", handleClick);
    // Once our component unmount or update, we must remove the event listener
    return () => document.removeEventListener("pointerdown", handleClick);

    // Use the modalRef as dependency for the useEffect hook
    // so whenever this reference changes, the listener will update
  }, [modalRef]);

  return (
    <div ref={modalRef} className="my-modal">
      <div className="modal-header">Super important Action</div>
      <div className="modal-body">
        This is an important message. read it carefully.
      </div>
      <div className="modal-footer">
        <button>Cancel</button>
        <button>Ok</button>
      </div>
    </div>
  );
}
```

But this implementation leaves a lot of room for duplication isn't? If we need
to handle a similar case on a different component, we will be doomed to repeat
the same click away logic. We can do better than that by leveraging the power of
custom React hooks.

## Sharing logic with Custom React hooks

In my opinion, hooks are one of the most beautiful features in React. You can
compose your components in such a way that gives your application superpowers.
React itself leverages the power of hooks with
[useState](https://reactjs.org/docs/hooks-state.html),
[useEffect](https://reactjs.org/docs/hooks-effect.html) and a bunch of others.

But we are not limited to the hooks React offers, we can create our own hooks,
enabling us to share logic in a very functional way across our app. Lets extract
that click away logic from our previous modal component into a custom hook:

```jsx
import { useEffect, useRef } from "react";

export function useClickAway(ref, onClickAway) {
  // Keep a mutable reference to click away callback
  // and change it every time the component using it changes
  // using 'useRef' here will make sure that we have a mutable
  // and single callback lying around.
  const callbackRef = useRef(onClickAway);
  useEffect(() => {
    callbackRef.current = onClickAway;
  }, [onClickAway]);

  // listen for click events on ref element
  // attaching a handler and calling the callback if necessary
  useEffect(() => {
    const onPointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callbackRef.current(event);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [ref]);
}
```

lets break our custom hook down.

- We start by declaring a plain javascript function called `useClickAway`. This
  function takes two arguments. A `ref` which is a mutable reference to the
  component we want to watch for clicks "outside" of its boundaries. And a
  `onClickAway` callback, which will be executed once we detect a click outside.

- We created a ref for the `useClickAway` callback using the `useRef` hook. This
  will make sure that we have only one reference to our `useClickAway` callback
  that is captured by our `useEffect` calls we will use later.

- On our first useEffect call, we make sure to keep track of the `useClickAway`
  reference. So in case our component updates the `useClickAway` reference, we
  also have to update our internal reference inside our custom hook.

- On our second useEffect call, this where rubber hits the road. If you pay
  close attention, this call is exactly the same as we implemented in our modal
  component. The only difference is that we are calling our `callbackRef`
  reference for the `onClickAway` function instead. This is an extra layer of
  check to make sure that we are calling the right reference of the callback
  once a click happens outside of the view.

With that in place, how can we use that in our modal component? Lets see how the
code looks like now:

```jsx
import React, { useRef } from "react";
import { useClickAway } from "./useClickAway";

export default function Modal({ onClose }) {
  const modalRef = useRef(null);

  useClickAway(modalRef, () => {
    onClose();
  });

  return (
    <div className="shadow-overlay">
      <div ref={modalRef} className="my-modal">
        <div className="modal-header">Super important Action</div>
        <div className="modal-body">
          This is an important message. read it carefully.
        </div>
        <div className="modal-footer">
          <button onClick={onClose}>Cancel</button>
          <button>Ok</button>
        </div>
      </div>
    </div>
  );
}
```

Can you notice how clean our modal component looks now? Better yet, we can reuse
that same logic across our app just by reusing the `useClickAway` hook. Isn't
that cool?

> Disclaimer: This simple modal we created here is highly inaccessible. You
> should not use that modal sample code in production.

[Here is the link](https://codesandbox.io/s/react-custom-hooks-see0d) to the
Codesandbox demo we built on this blogpost. Feel free to copy and use it on your
apps.
