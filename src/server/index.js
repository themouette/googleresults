//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var http = require('http');
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var child_process = require('child_process');
var express = require('express');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var session = require('express-session');
var serveStatic = require('serve-static');
var swig = require('swig');
var cookie = require("cookie");
var writeAttachment = require('./lib/attachment').write;
var debug = require('debug')('googleresults:express');
var os = require('os');

//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//  * `ip` - bind address. If `process.env.IP` is set, _it overrides this value_.
//
var app = express();
var router = express.Router();
var server = http.createServer(app);
var io = require('socket.io')(server);

// NOTE: We'll need the site secret later too, so let's factor it out.
// The security implications of this are left to the reader.
var SITE_SECRET = 'I am not wearing any pants';


//
// ## Register middlewares
//
(function configure() {
    // parse application/x-www-form-urlencoded
    app.use(bodyParser.urlencoded({ extended: false }));
    // parse application/json
    app.use(bodyParser.json());
    // allow _method query param to override HTTP method form a POST request.
    app.use(methodOverride('_method'));
    // NOTE: We'll need to know the key used to store the session, so
    // we explicitly define what it should be. Also, we pass in
    // our sessionStore container here.
    app.use(session({
        key: 'express.sid',
        secret: SITE_SECRET
    }));
    // use Swig as template engine
    app.engine('html', swig.renderFile);
    app.set('view engine', 'html');
    app.set('views', __dirname + '/views');
    // Swig will cache templates for you, but you can disable
    // that and use Express's caching instead, if you like:
    app.set('view cache', false);
    // To disable Swig's cache, do the following:
    swig.setDefaults({ cache: false });
    // NOTE: You should always cache templates in a production environment.
    // Don't leave both of these to `false` in production!

    app.set('downloadDir', path.resolve(path.join(__dirname, '..','..','client','download')));
    if (!fs.existsSync(app.get('downloadDir'))) {
        mkdirp(app.get('downloadDir'));
    }
})();

//
// ## Declare routes
//

app.get('/', function(req, res, next) {
    res.render('index');
});
app.use('/download', serveStatic(app.get('downloadDir'), {}));
app.post('/', function (req, res, next) {
    // define a link store
    var links = [];

    // Parse arguments.
    var limit = req.body.limit || 10;
    var search = req.body.query || '';
    var wait = typeof req.body.wait === "undefined" ? 1 : req.body.wait;
    var socketid = req.body.socketid;
    var screenshot = req.body.screenshot;
    // validate arguments.
    if (!socketid) {
      return next(new Error('No valid socket'));
    }
    if (!search.length) {
        return next(new Error('No searchword'));
    }

    // lanch casper cli
    var casperresults = path.resolve(path.join(__dirname, '..', '..', 'bin', 'googleresults'));
    var args = [
            '--stream',
            '--limit=' + limit,
            '--rich',
            '--wait='+wait,
        ];
    if (screenshot) {
        args.push('--screenshot='+app.get('downloadDir'));
    }
    var ls = child_process.spawn(casperresults, args.concat(search.split(' ')));
    ls.stdout.on('data', function (data) {
        debug('stdout: ' + data);
        // as many chunks of data can be received at once,
        // we need to separate each line
        // and remove epty lines.
        data.toString()
            .split(os.EOL)
            .filter(function (msg) {
                return msg.length;
            })
            .forEach(function handleCasperMessage(msg) {
                var message;
                try {
                    message = JSON.parse(msg);
                } catch (err) {
                    debug('unable to parse data ' + msg);
                    debug(err);
                }
                switch(message.type) {
                    case 'screenshot':
                        io.to(socketid).emit('screenshot', JSON.stringify({
                            url: '/download/' + message.filename
                        }));
                        break;
                    case 'links':
                        io.to(socketid).emit('results', JSON.stringify(message.links));
                        // Add to links store.
                        links = links.concat(message.links);
                        break;
                    case 'error':
                        debug('ERROR Casper script returned following error:', JSON.stringify(message));
                        break;
                }
        });
    });
    ls.stderr.on('data', function (data) {
        debug('stderr: ' + data);
    });
    ls.on('close', function (code) {
        debug('child process exited with code ' + code);
        try {
            var csv = writeAttachment(app.get('downloadDir'), links, 'csv');
            var json = writeAttachment(app.get('downloadDir'), links, 'json');
        } catch (e) {
            debug(e);
        }
        var statusCode = code == 0 ? 200 : 500;
        res
            .status(statusCode)
            .send(JSON.stringify({
                links: links,
                csv: '/download/' + csv,
                json: '/download/' + json
            }));
    });

});

// error handler
app.use(function(err, req, res, next){
  debug(err.stack);
  res.send(500, 'Something broke!');
});
/*
io.set('authorization', function (handshakeData, accept) {

  if (handshakeData.headers.cookie) {

    handshakeData.cookie = cookie.parse(handshakeData.headers.cookie);

    handshakeData.sessionID = session(handshakeData.cookie['express.sid'], 'secret');

    if (handshakeData.cookie['express.sid'] == handshakeData.sessionID) {
      return accept('Cookie is invalid.', false);
    }

  } else {
    return accept('No cookie transmitted.', false);
  }

  accept(null, true);
});
//*/
io.on('connection', function(socket){
  console.log('a user connected with session ' + socket.id);
  socket.emit('signin', socket.id);
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Googleresults server listening at", addr.address + ":" + addr.port);
});
