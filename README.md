# Googleresults

Fetch Google results accross multiple pages.

## Setup

    $ npm install

## Harvest links

Just run the following

``` bash
bin/googleresults --stream --limit=5 your search terms
```

## Running the server

    $ nodemon src/server/index.js
    Googleresults server listening at 0.0.0.0:3000

Once the server is running, open `http://localhost:3000` in your browser.

## npm scripts

* `npm start` start a production server
* `npm test` run mocha tests
* `npm run-script dev` start dev environment
* `npm install` install dependencies and create required directories