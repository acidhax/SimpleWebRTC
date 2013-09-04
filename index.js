var express = require('express'),
  expressLayouts = require('express-ejs-layouts'),
	clc = require('cli-color'),
	db = require('./db'),
  index = require('./routes'),
  user = require('./routes/user'),
  fs = require('fs'),
  serviceListenPort = process.env.serviceListenPort || 3003,
  serviceListenProtocol = process.env.serviceListenProtocol || 'http',
  serviceExternalPort = process.env.serviceExternalPort || 443,
  serviceExternalProtocol = process.env.serviceExternalProtocol || 'https',
  sessionSecret = process.env.sessionSecret || 'TIZZZ A PARTAAAY UP IN THE HIZZOOOO',
  sessionKey = process.env.sessionKey || 'disco.sid',
  cookieParser = express.cookieParser(sessionSecret);

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
  	store: new RedisStore({
      pubsub: new RedisPubSub({pubClient: db.redis.client, subClient: db.redis.subClient}),
      prefix: process.env.sessionPrefix || 'discoSession:'
    }),
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

app.listen(serviceListenPort, function(){
  console.log("Service listening on port " + clc.yellow(serviceListenPort + ' ' +serviceExternalPort)  + " in " + app.settings.env + " mode");
});
