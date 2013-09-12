var express = require('express'),
  http = require('http'),
  io,
  expressLayouts = require('express-ejs-layouts'),
	clc = require('cli-color'),
	db = require('./db'),
  index = require('./routes'),
  user = require('./routes/user'),
  fs = require('fs'),
  os = require('os'),
  async = require('async'),
  serviceListenPort = process.env.serviceListenPort || 3003,
  serviceListenProtocol = process.env.serviceListenProtocol || 'http',
  serviceExternalPort = process.env.serviceExternalPort || 443,
  serviceExternalProtocol = process.env.serviceExternalProtocol || 'https',
  sessionSecret = process.env.sessionSecret || 'TIZZZ A PARTAAAY UP IN THE HIZZOOOO',
  sessionKey = process.env.sessionKey || 'disco.sid',
  cookieParser = express.cookieParser(sessionSecret),
  wormholeListenPort = process.env.serviceListenPort || 3003,
  wormholeExternalPort = process.env.serviceExternalPort || 443,
  wormholeExternalProtocol = process.env.serviceExternalProtocol || 'https';

var RedisStore = null;
if (fs.existsSync('../connect-redis-pubsub')) {
  RedisStore = require('../connect-redis-pubsub')(express);
} else {
  RedisStore = require('connect-redis-pubsub')(express);
}

var RedisPubSub = null;
if (fs.existsSync('../redis-pub-sub')) {
  RedisPubSub = require('../redis-pub-sub');
} else {
  RedisPubSub = require('redis-sub');
}
var sessionStore = new RedisStore({
    pubsub: new RedisPubSub({pubClient: db.redis.client, subClient: db.redis.subClient}),
    prefix: process.env.sessionPrefix || 'discoSession:'
});

if (fs.existsSync('../wormhole-remix')) {
  wormholeServer = require('../wormhole-remix');
} else {
  wormholeServer = require('wormhole-remix');
}


wh = new wormholeServer({
  protocol: wormholeExternalProtocol,
  hostname: os.hostname(),
  port: wormholeExternalPort,
  sessionStore: sessionStore,
  cookieParser: cookieParser,
  sessionKey: sessionKey
});

var app = module.exports = express();
// Configuration
app.configure(function(){
  app.set('trust proxy', true);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.set('layout', 'layout');
  app.use(express.bodyParser({ keepExtensions: true}));
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({
  	secret: sessionSecret,
  	store: sessionStore,
  	cookie: {
      path: '/',
      httpOnly: false,
      maxAge: process.env.sessionMaxAge?parseInt(process.env.sessionMaxAge, 10):(1000 * 60 * 60 * 24 * 60),
      domain: process.env.cookieDomain || 'groupnotes.ca'
    },
    key: sessionKey
  }));
  app.use(function(req, res, next){
    console.log('%s %s', clc.yellow(req.method), req.url);
    next();
  });
  app.use(function(req, res, next) {
    if (req.headers['x-partyon'] && req.headers['x-partyon'] == 'Garth') {
      res.set('X-PartyOn', 'Wayne');
      req.hasExtension = true;
    } else {
      req.hasExtension = false;
    }
    next();
  });
  app.use(expressLayouts);
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

app.get('*', function(req, res, next) {
  if (req.headers["x-forwarded-proto"] === 'http') {
    res.redirect("https://" + req.headers.host + req.url);
  }
  else {
    next();
  }
});


app.get('/crash-bandicoot', function(req, res) {
  (function(){
    setTimeout(function () {
      throw new Error();
    });
  })();
});


app.get('/', index.home);
app.get('/no-chrome', index.noChrome);
app.get('/extension-get', index.extensionGet);
app.get('/welcome', user.welcome);
app.get('/register', user.register);
app.post('/register', user.registerPost);
app.get('/login', user.login);
app.post('/login', user.loginPost);
app.get('/logged-in', user.loggedIn);
app.get('/logout', user.logout);
app.post('/add-friend', user.addFriend);
app.get('/update-photo', user.updatePhoto);

app.get('/nuke-all-of-the-things-okay-thx-baiiiiii', function(req, res) {
  res.send('<html><body><form method="post"><input name="password" type="password"><input type="submit"></form></body></html>');
})

app.post('/nuke-all-of-the-things-okay-thx-baiiiiii', function(req, res) {
  if (req.body.password === 'the goggles they do nothing') {
    db.nukeAllOfTheThings(function() {
      res.send([].slice.call(arguments));
    });
  } else {
    res.redirect('http://meatspin.com');
  }
});

app.get('/setup-vanity', function(req, res) {
  async.parallel([function(next) {
    db.Account.count({ deleted: null }, function(err, count) {
      if (!err && count) {
        db.vanity.accounts.set(count, next);
      } else {
        next(err);
      }
    });
  }, function(next) {
    db.Comment.count({ deleted: null }, function(err, count) {
      if (!err && count) {
        db.vanity.comments.set(count, next);
      } else {
        next(err);
      }
    });
  }, function(next) {
    db.Note.count({ deleted: null }, function(err, count) {
      if (!err && count) {
        db.vanity.notes.set(count, next);
      } else {
        next(err);
      }
    });
  }], function(err) {
    res.send(err || 'success');
  });
});

app.get('/thing', function(req, res) {
  if (!req.session.somenum) {
    req.session.somenum = 0;
  }
  res.send({num: ++req.session.somenum});
});

app.post('/uploadPhoto', user.uploadPhoto);
app.get('/user/profilePhoto/:accountId', user.getProfilePhoto);

app.get('/extension-connect', function(req, res) {
  db.wormhole.getHealthiestWormhole(function(err, wormhole) {
    if (!err && wormhole && wormhole.length) {
      res.redirect(wormhole[0] + '/wormhole/disco/connect.js');
    } else {
      res.writeHead(res.statusCode);
      res.end();
    }
  });
});

wh.addNamespace('/service');
wh.setPath(wormholeExternalProtocol + "://"+os.hostname()+":"+wormholeExternalPort+"/service/connect.js");
wh.on("live", function (cb) {
  var self = this;
  var commentCount = 0;
  var noteCount = 0;
  var commentDone = db.vanity.comments.subscribe(function (count) {
    commentCount = count;
    self.rpc.setTotalCount(null, commentCount + noteCount);
  });

  var noteDone = db.vanity.notes.subscribe(function (count) {
    noteCount = count;
    self.rpc.setTotalCount(null, commentCount + noteCount);
  });

  this.on("disconnect", function () {
    commentDone();
    noteDone();
  });
});

var server = http.createServer(app);
server.listen(serviceListenPort, function(){
  console.log("Service listening on port " + clc.yellow(serviceListenPort + ' ' +serviceExternalPort)  + " in " + app.settings.env + " mode");
  io = require('socket.io').listen(server);
  io.set('transports', [
    'flashsocket'
    , 'htmlfile'
    , 'xhr-polling'
    , 'jsonp-polling'
  ]);
  io.set('log level', process.env.socketioLogLevel || 0);
  wh.start({
    io: io,
    express: app,
    report: false
  }, function (err) {
    wh.on("connection", function (traveller) {
      // Do it.
    });
  });
});
