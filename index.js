var express = require('express'),
	clc = require('cli-color'),
	db = require('./db');

var RedisStore = require('connect-redis')(express);

var app = module.exports = express.createServer();

// Configuration
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({ 
  	secret: process.env.sessionSecret || 'Something to do with disco',
  	store: new RedisStore({ client: db.redis.client, prefix: 'discoSession:' }),
  	cookie: { path: '/', httpOnly: false, maxAge: 1000 * 60 * 60 * 24 * 60 },
    key: 'disco.sid'
  }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  app.use(function(req, res, next){
	  console.log('%s %s', clc.yellow(req.method), req.url);
	  next();
	});
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes

app.get('/', function(req, res) {
	res.send('yo');
});

app.get('/crash-bandicoot', function(req, res) {
  (function(){
    setTimeout(function () {
      throw new Error();
    });
  })();
});

app.listen(3003, function(){
  console.log("Service listening on port " + clc.yellow(app.address().port) + " in " + app.settings.env + " mode");
});
