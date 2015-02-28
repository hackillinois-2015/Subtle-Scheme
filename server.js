/*************************
	CONFIG
**************************/
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
/*************************
	PAGE ROUTES
**************************/
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
	questionSetsModel.find({}, function (error, documents) {
		response.json(documents);
	})
})
/*************************
	Variables
**************************/
var sessions = [];

var session = function () {
	this.gameCode = "";
	this.clientCount = 0;
	this.questionSets = [];//question set id'
	this.players = [];//array of player object
	this.questionsAsked = [];//question id'
	this.round = 0;
	this.phase = 'joiningPhase';
}

var player = function () {
	this.username = "";
	this.score = 0;
	this.lie = "";
	this.choice = "";
}

var questionSetTemplate = {
	name: "",
	questions: []//array of questions
}
var questionTemplate = {
	prompt: "",
	answer: ""
}
/*************************
	SCHEMAS
**************************/
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
var questionSetsModel = mongoose.model('question_sets', questionSetSchema);
/*************************
	Socket
**************************/
io.on('connection', function (socket) {
	//console.log('Device Connected');
	socket.on('disconnect', function() {
		console.log("Client Disconnected");
		if(isExistingGameCode(socket.gameCode)) sessions[socket.gameCode].clientCount--;
		//if the display left, kick everyone and delete session
		if(socket.role == "display") closeSession(socket.gameCode);
		//if a gamepad leaves, do nothing. let them potentially reconnect
	});
	/*************************
		Display Specific
	**************************/
	/*======================
		Setup
	=======================*/
	socket.on('display join', function (questionSetsJSON) {
		console.log('Display Attempting to Join');
		var questionSets = JSON.parse(questionSetsJSON);
		//console.log(JSON.stringify(questionSets));
		//mark socket as display
		socket.role = "display";
		//generate the code
		var gameCode = generateGameCode();
		socket.gameCode = gameCode;
		//confirm question sets exist
		if(!validQuestionSets(questionSets)) socket.emit('bad question sets');
		else {
			//create the session
			addSession(gameCode, questionSets);
			//add as a client
			addClient(socket);
			console.log('New Display: '+socket.gameCode);
		}
	});
	/*======================
		Gameplay: 
	=======================*/
	/*************************
		Gamepad Specific
	**************************/
	/*======================
		Setup
	=======================*/
	socket.on('gamepad join', function (dataJSON) {
		socket.emit('alert', "gamepad join received");
		var data = JSON.parse(dataJSON);
		socket.gameCode = data.gameCode;
		//market socket as gamepad
		socket.role = "gamepad";
		//check if gameCode is it's a valid gameCode
		if(!isExistingGameCode(data.gameCode)) socket.emit('bad game code');
		else if(usernameExists(data.gameCode, data.username)) socket.emit('duplicate username');
		else {
			socket.emit('alert', "valid gamecode and username");
			//set data
			socket.gameCode = data.gameCode;
			//add player
			addGamePad(data.gameCode, data.username);
			//add client
			addClient(socket);
			socket.emit('alert', "done");
		}
	});
});

var usernameExists = function (gameCode, username) {
	for(var i = 0; i < sessions[gameCode].players.length; i++) {
		if(sessions[gameCode].players[i].username == username) {
			console.log("duplicate username: ("+sessions[gameCode].players[i].username+", "+username+")");
			return true;
		}
	}
	return false;
}
var validQuestionSets = function (questionSets) {
	console.log(questionSets.length);
	for(var i = 0; i < questionSets.length; i++) {
		questionSetsModel.findOne({ _id: questionSets[i] }, function (err, doc) {
			if(err) return false;
		});
	}
	return true;
}
var addGamePad = function (gameCode, username) {
	var index = sessions[gameCode].players.length;
	console.log("adding user: "+index);
	sessions[gameCode].players[index] = new player();
	console.log("first user: "+sessions[gameCode].players[0].username);
	sessions[gameCode].players[index].username = username; 
	console.log("first user after creation: "+sessions[gameCode].players[0].username);
}

var closeSession = function (gameCode) {
	io.to(gameCode).emit('display quit');
	delete sessions[gameCode];
}

var updateClientSessions = function (gameCode) {
	io.to(gameCode).emit('session update', JSON.stringify(sessions[gameCode]));
}

var addSession = function (gameCode, questionSets) {
	sessions[gameCode] = new session();
	sessions[gameCode].gameCode = gameCode;
	sessions[gameCode].questionSets = questionSets;
}

var addClient = function (socket) {
	socket.join(socket.gameCode);
	sessions[socket.gameCode].clientCount++;
	updateClientSessions(socket.gameCode);
};

var generateGameCode = function () {
	var uniqueCode = false;
	while(!uniqueCode) {
		var newGameCode = genRandLetter()+genRandLetter()+genRandLetter()+genRandLetter();
		if(!isExistingGameCode(newGameCode)) uniqueCode = true;
	}
	return newGameCode;
};

var isExistingGameCode = function(gameCode) {
	if(typeof sessions[gameCode] === 'undefined') return false;
	else return true;
}

var genRandLetter = function () {
	var randInt = Math.floor(Math.random()*26);
	return String.fromCharCode(65+randInt);
};
/*************************
	Execution
**************************/
server.listen(port);
console.log('Running on port ' + port);