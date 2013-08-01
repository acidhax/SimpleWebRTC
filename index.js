var express = require('express'),
	clc = require('cli-color'),
	db = require('./db'),
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

var app = module.exports = express();
// Configuration
app.configure(function(){
  app.set('trust proxy', true);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.set('layout', 'layout.ejs');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({
  	secret: sessionSecret,
  	store: new RedisStore({ 
      client: db.redis.client, 
      subClient: db.redis.subClient, 
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
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes
app.get('*', function(req, res, next) {
  res.set('X-PartyOn', 'Garth');
  next();
});

app.get('/', function(req, res) {
	if (!req.session.count) {
		req.session.count = 0;
	}

	req.session.count++;
	res.send('yo: ' + req.session.count);
});

app.get('/crash-bandicoot', function(req, res) {
  (function(){
    setTimeout(function () {
      throw new Error();
    });
  })();
});

app.get('/login', user.login);
app.post('/login', user.loginPost);
app.get('/logged-in', user.loggedIn);
app.get('/logout', user.logout);
app.post('/add-friend', user.addFriend);


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
