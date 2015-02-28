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

app.get('/display', function (request, response) {
	response.render('pages/display');
});

app.get('/gamepad', function (request, response) {
	response.render('pages/gamepad');
});
/*******************
	Variables
********************/
var sessions = [];
var sessionTemplate = {
	gameCode: "",
	questionPacks: [],//question pack id's
	players: [],//array of player objects
	questionsAsked: [],//question id's
	round: 0
};
var playerTemplate = {
	name: "",
	score: "",
};
/*******************
	Socket
********************/
io.on('connection', function (socket) {
	console.log('Device Connected');
	/*******************
		Display Specific
	********************/
	socket.on('displayJoin', function () {

	});
	/*******************
		Gamepad Specific
	********************/
});

/*******************
	Execution
********************/
server.listen(port);
console.log('Running on port ' + port);