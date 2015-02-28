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
//game config
var MAX_PLAYERS = 8;
var GAME_NAME = "Subtle Pineapple";
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
/*======================
	Constants
=======================*/
var ROUNDS = [
	{
		name: "Round 1",
		foolReward: 500,
		truthReward: 1000,
		questionCount: 3
	},
	{
		name: "Round 2",
		foolReward: 1000,
		truthReward: 2000,        
		questionCount: 3
	},
	{
		name: "Round 3",
		foolReward: 1500,
		truthReward: 3000,
		questionCount: 3
	},
	{
		name: ("Final "+GAME_NAME),
		foolReward: 2000,
		truthReward: 4000,
		questionCount: 1
	}
]
/*======================
	Classes
=======================*/
var session = function () {
	this.gameCode = "";
	this.clientCount = 0;
	this.questionSets = [];//question set id'
	this.players = [];//array of player object
	this.questionsAsked = [];//question id'
	this.round = -1;//4 rounds
	this.question = 0;//3 questions per round except last, which has 1
	this.phase = 'joining';
	this.rounds = ROUNDS;
	this.currentQuestion = null;
}

var player = function () {
	this.username = "";
	this.score = 0;
	this.lie = "";
	this.choice = "";
}
/*======================
	Other
=======================*/
var sessions = [];
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
	/*************************
		SETUP
	**************************/
	/*======================
		Display Specific
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
		if(questionSets.length > 0 && !validQuestionSets(questionSets)) socket.emit('bad question sets');
		else {
			//create the session
			addSession(gameCode, questionSets);
			//add as a client
			addClient(socket);
			console.log('New Display: '+socket.gameCode);
		}
	});
	/*======================
		Gamepad Specific
	=======================*/
	socket.on('gamepad join', function (dataJSON) {
		socket.emit('alert', "gamepad join received");
		var data = JSON.parse(dataJSON);
		socket.gameCode = data.gameCode;
		//market socket as gamepad
		socket.role = "gamepad";
		//check if gameCode is it's a valid gameCode
		if(!isExistingGameCode(data.gameCode)) socket.emit('bad game code');
		//check if username is a duplicate
		else if(usernameExists(data.gameCode, data.username)) socket.emit('duplicate username');
		//check if we maxed out on players
		else if(sessions[data.gameCode].players.length >= MAX_PLAYERS) socket.emit('maximum players reached');
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
	/*************************
		PHASE: JOINING
	**************************/
	socket.on('everybody in', function() {
		sessions[socket.gameCode].phase = 'roundIntro';
		sessions[socket.gameCode].round++;
		updateClientSessions(socket.gameCode);
	});
	/*************************
		PHASE: ROUND INTRO
	**************************/
	socket.on('roundIntro end', function() {
		var session = sessions[socket.gameCode];
		session.phase = 'lying';
		session.currentQuestion = getQuestion(session.questionSets, session.questionsAsked);
		session.questionsAsked.push(session.currentQuestion.questionId);
		updateClientSessions(socket.gameCode);
	});
	/*************************
		PHASE: LYING
	**************************/
	/*************************
		PHASE: CHOOSING
	**************************/
	/*************************
		PHASE: REVEALING
	**************************/
	/*************************
		PHASE: SCOREBOARD
	**************************/
	/*************************
		PHASE: GAME OVER
	**************************/
	/*************************
		CLEAN UP
	**************************/
	socket.on('disconnect', function() {
		console.log("Client Disconnected");
		if(isExistingGameCode(socket.gameCode)) sessions[socket.gameCode].clientCount--;
		//if the display left, kick everyone and delete session
		if(socket.role == "display") closeSession(socket.gameCode);
		//if a gamepad leaves, do nothing. let them potentially reconnect
	});
});

var getQuestion = function (questionSets, questionsAsked) {
	//pick a random question set
	var rand = Math.floor(Math.random()*questionSets.length);
	//get the question set
	questionSetsModel.findOne({ _id: questionSets[rand] }, function (error, questionSet) {
		var isNew = false;
		console.log()
		while(!isNew) {
			//pick a random one from the question set
			var randa = Math.floor(Math.random()*questionSet.questions.length);
			//question id is the [question_set objectid]-[index]
			var randQuestionId = questionSets[rand]+"-"+randa;
			var question =  questionSet.questions[randa];
			//verify it is new
			if(questionsAsked.indexOf(randQuestionId) == -1) isNew = true;
		}
		//append questionId
		question.qustionId = randQuestionId;
		//return it
		return question;
	})
}

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