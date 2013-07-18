var express = require('express'),
	clc = require('cli-color'),
	db = require('./db');

var app = module.exports = express.createServer();

// Configuration
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({ secret: 'your secret here' }));
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
