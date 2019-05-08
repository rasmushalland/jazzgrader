# JazzGrader

A simple, browser-based application that makes it easy to quickly
enter grade comments for students, based on a library of canned sentences.

## Hosting/using

It's just a couple of html pages with some typescript that compiles to
javascript, so a static webserver is fine. It doesn't actually need a web
server, though, one can just open index.html in a browser directly from the
file system.

##  Development

The only tool that it needed for development is a TypeScript compiler.
Using VS Code is one way of getting there.

Using the 'tsc: watch' build tool from within VS is an easy way to compile the typescript code.

The resulting `.js` files should be checked into git.

