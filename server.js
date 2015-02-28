/*******************
	CONFIG
********************/
//express
var express = require('express');
var app = express();
//ejs
app.set('view engine', 'ejs');
//socket
var server = require('http').createServer(app);
var io = require('socket.io')(server);
//mongodb
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/familyFeud');
//app
var pdir = __dirname + '/public';
app.use(express.static(pdir));
var port = 80;
/*******************
	PAGE ROUTES
********************/
app.get('/', function (request, response) {
	response.render('pages/index');
});

/*******************
	Execution
********************/
server.listen(port);
console.log('Running on port ' + port);