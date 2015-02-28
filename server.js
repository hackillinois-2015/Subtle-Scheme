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
mongoose.connect('mongodb://localhost/subtlePineapple');
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

app.get('/questionSets', function(request, response) {
	questionSets.find({}, function (error, documents) {
		response.json(documents);
	})
})
/*******************
	Variables
********************/
var sessions = [];
var sessionTemplate = {
	gameCode: "",
	clientCount: 0,
	questionPacks: [],//question pack id's
	players: [],//array of player objects
	questionsAsked: [],//question id's
	round: 0
};
var playerTemplate = {
	name: "",
	score: "",
};
var questionSetTemplate = {
	name: "",
	questions: []//array of questions
}
var questionTemplate = {
	prompt: "",
	answer: ""
}
/*******************
	SCHEMAS
********************/
var Schema = mongoose.Schema;
var questionSetSchema = new Schema({
	name: String,
	questions: [
		{
			prompt: String,
			answer: String
		}
	]
});
var questionSets = mongoose.model('question_sets', questionSetSchema);
/*******************
	Socket
********************/
io.on('connection', function (socket) {
	console.log('Device Connected');
	socket.on('disconnect', function() {
		console.log("Client Disconnected");
		//remove socket from room
		socket.leave(socket.gameCode);
		sessions[socket.gameCode].clientCount--;
		//check if the room is abandoned
		if(sessions[socket.gameCode].clientCount == 0) delete sessions[socket.gameCode];
	});
	/*******************
		Display Specific
	********************/
	socket.on('displayJoin', function () {
		//generate the code
		var gameCode = generateGameCode();
		socket.gameCode = gameCode;
		//create the session
		sessions[gameCode] = sessionTemplate;
		sessions[gameCode].gameCode = gameCode;
		//add as a client
		addClient(socket);
		console.log('New Display: '+socket.gameCode);
	});
	/*******************
		Gamepad Specific
	********************/
	socket.on('gamepadJoin', function (gameCode) {
		//check if gameCode is it's a valid gameCode
			//if not, emit bad game code
		//set gameCode
		socket.gameCode = gameCode;
		//add client
		addClient(socket);
	});
});

var updateClientSessions = function (gameCode) {
	io.to(gameCode).emit('session update', JSON.stringify(sessions[gameCode]));
}

var addClient = function (socket) {
	socket.join(socket.gameCode);
	sessions[socket.gameCode].clientCount++;
	updateClientSessions(socket.gameCode);
};

var generateGameCode = function () {
	var uniqueCode = false;
	while(!uniqueCode) {
		var gameCode = genRandLetter()+genRandLetter()+genRandLetter()+genRandLetter();
		uniqueCode = true;
	}
	return gameCode;
};

var genRandLetter = function () {
	var randInt = Math.floor(Math.random()*26);
	return String.fromCharCode(65+randInt);
};
/*******************
	Execution
********************/
server.listen(port);
console.log('Running on port ' + port);