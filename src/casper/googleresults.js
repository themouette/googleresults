/*jshint strict:false*/
/*global CasperError, console, phantom, require*/

/**
 * Capture multiple pages of google search results
 *
 * Usage:
 *
 * $ casperjs googleresults.js my search terms
 * $ casperjs googleresults.js my search terms --limit=5
 * $ casperjs googleresults.js my search terms --stream
 *
 * (all arguments will be used as the query)
 */
var links = [];

var casper = require("casper").create({
    waitTimeout: 1000,
    pageSettings: {
        //userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:23.0) Gecko/20130404 Firefox/23.0"
        userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/34.0.1847.116 Chrome/34.0.1847.116 Safari/537.36"
    }
});
var currentPage = 1;

// Parse cli arguments
// search terms
var search = casper.cli.args.join(" ");
// Number of page to crawl
var limit = casper.cli.options.limit || 10;
// print results as live stream
var stream = casper.cli.options.stream;
// return rich objects
var rich = casper.cli.options.rich;
var help = casper.cli.options.about;

if (help) {
    usage();
}

if (search.length === 0) {
    usage();
}


casper.on('error', function (err) {
    casper.log(err, 'error');
    casper.capture('error.png');
    casper.exit(1);
});

function usage() {
    casper
        .echo("Return a list of google results formated in JSON.")
        .echo("")
        .echo("  Usage:")
        .echo("       $ casperjs googleresults.js casperjs")
        .echo("       $ casperjs googleresults.js learn casperjs --limit=5 --stream")
        .echo("")
        .echo("  Options:")
        .echo("    --about         show this help.")
        .echo("    --limit=LIMIT   crawl LIMIT google pages (default 10).")
        .echo("    --stream        return results when available. This writes formated results as soon as it is extracted.")
        .echo("    --rich          return json objects instead of raw url.")
        .echo("")
        .exit(1)
    ;
}


// Retrieve links from a google results page page
function getLinks(rich) {
    //var links = document.querySelectorAll("h3.r a");
    return Array.prototype.map.call(document.querySelectorAll("h3.r a"), function(e) {
        var href;
        try {
            // google handles redirects hrefs to some script of theirs
            href = (/url\?q=(.*)&sa=U/).exec(e.getAttribute("href"))[1];
        } catch (err) {
            href = e.getAttribute("href");
        }

        if (!rich) {
            return href;
        }

        return {
            href: href,
            title: e.innerText
        };
    });
}

// write links to output
function formatLinks(links) {
    if (!links instanceof Array) {
        links = [links];
    }
    casper.echo(JSON.stringify(links));
}

// handle page crawling
var processPage = function() {
    // emulate a user looking at results with a random time
    var waitTime = 1 + (Math.random() * 3);
    this
        //.echo('Will wait for ' + Math.floor(waitTime))
        .wait(waitTime * 1000);
    var url;
    var pageLinks;
    // capturing current page
    this
        .then(function () {
            // get all available links
            pageLinks = this.evaluate(getLinks, rich);
            links = links.concat(pageLinks);

            // if stream, then write to output
            if (stream) {
                formatLinks(pageLinks);
            }

            // don't go too far down the rabbit hole
            if (currentPage >= limit || !this.exists("#pnnext")) {
                return terminate.call(casper);
            }

            currentPage++;

            // Requesting next page
            url = this.getCurrentUrl();
            this
                // click on page next
                .thenClick("#pnnext")
                // wait url changes
                .then(function() {
                    this.waitFor(function() {
                        return url !== this.getCurrentUrl();
                    }, processPage, terminate);
                });
        });
};


// write links to the output if not streamed.
function terminate(err){
    casper.capture('terminate.png');
    if (!stream) {
        formatLinks(links);
    }
}



casper.start("http://google.fr/", function() {
    this.fill('form[action="/search"]', {
        q: search
    }, true);
});

casper
    .waitForSelector('#pnnext', processPage, terminate);

casper.run();
