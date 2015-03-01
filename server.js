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
//allow strings to be cast to ObjectIds
String.prototype.toObjectId = function() {
  var ObjectId = (require('mongoose').Types.ObjectId);
  return new ObjectId(this.toString());
};
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
	this.round = 0;//4 rounds
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
		//console.log('Display Attempting to Join');
		var questionSets = JSON.parse(questionSetsJSON);
		//console.log(JSON.stringify(questionSets));
		//mark socket as display
		socket.role = "display";
		//generate the code
		var gameCode = generateGameCode();
		socket.gameCode = gameCode;
		//confirm question sets exist
		if(questionSets.length <= 0 || !validQuestionSets(questionSets)) socket.emit('bad question sets');
		else {
			//create the session
			addSession(gameCode, questionSets);
			//add as a client
			addClient(socket);
			//console.log('New Display: '+socket.gameCode);
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
			socket.username = data.username;
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
		updateClientSessions(socket.gameCode);
	});
	/*************************
		PHASE: ROUND INTRO
	**************************/
	socket.on('roundIntro end', function() {
		var session = sessions[socket.gameCode];
		session.phase = 'lying';
		setSessionQuestion(session);
	});
	/*************************
		PHASE: LYING
	**************************/
	/*======================
		Gamepad Specific
	=======================*/
	socket.on('submit lie', function(lie) {
		var player = getSessionPlayer(sessions[socket.gameCode], socket.username);
		if(player == null) socket.emit('invalid player');
		else {
			//ensure lie is unique
			if(!lieIsUnique(sessions[socket.gameCode], lie)) socket.emit('duplicate lie');
			else {
				//set user's lie
				player.lie = lie;
				//update
				updateClientSessions(socket.gameCode);
			}
		}
	})
	/*======================
		Display Specific
	=======================*/
	socket.on('done lying', function() {
		sessions[socket.gameCode].phase = "choosing";
		updateClientSessions(socket.gameCode);
	})
	/*************************
		PHASE: CHOOSING
	**************************/
	/*======================
		Gamepad Specific
	=======================*/
	socket.on('submit choice', function(choice) {
		var player = getSessionPlayer(sessions[socket.gameCode], socket.username);
		if(player == null) socket.emit('invalid player');
		else {
			//set user's choice
			player.choice = choice;
			/*
			//check if all choices are in
			if(allChoicesIn(sessions[socket.gameCode]))
			{
				updateScores(sessions[socket.gameCode]);
				sessions[socket.gameCode].phase = "revealing";
			}
			*/
			//update
			updateClientSessions(socket.gameCode);
		}
	})
	/*======================
		Display Specific
	=======================*/
	socket.on('done choosing', function() {
		updateScores(sessions[socket.gameCode]);
		sessions[socket.gameCode].phase = "revealing";
		updateClientSessions(socket.gameCode);
	})
	/*************************
		PHASE: REVEALING
	**************************/
	/*======================
		Display Specific
	=======================*/
	socket.on('done revealing', function() {
		sessions[socket.gameCode].phase = "scoreboard";
		updateClientSessions(socket.gameCode);
	})
	/*************************
		PHASE: SCOREBOARD
	**************************/
	/*======================
		Display Specific
	=======================*/
	socket.on('done showing scoreboard', function() {
		progressSession(sessions[socket.gameCode]);
	})
	/*************************
		PHASE: GAME OVER
	**************************/
	/*************************
		CLEAN UP
	**************************/
	socket.on('disconnect', function() {
		//console.log("Client Disconnected");
		if(isExistingGameCode(socket.gameCode)) sessions[socket.gameCode].clientCount--;
		//if the display left, kick everyone and delete session
		if(socket.role == "display") closeSession(socket.gameCode);
		//if a gamepad leaves, do nothing. let them potentially reconnect
	});
});

var lieIsUnique = function (session, lie) {
	session.players.forEach(function (player) {
		if(player.lie == lie) return false;
	})
	return true;
}

var updateScores = function (session) {
	var answer = session.currentQuestion.answer;
	var round = session.rounds[session.round];
	session.players.forEach(function (player) {
		//give points for finding truth
		if(player.choice == answer) player.score += round.truthReward;
		//give points for successful lies
		for(var i = 0; i < session.players.length; i++) {
			if(session.players[i].choice == player.lie) player.score += round.truthReward;
		}
	})
}

var progressSession = function (session) {
	console.log('a');
	var round = session.rounds[session.round];
	//one way flags
	var gameOver = false;
	var newRound = false;
	console.log('b');
	//increment round / question
	if(session.question < round.questionCount) session.question++;
	else if(session.round < session.rounds.length-1){
		session.round++;
		session.question = 0;
		newRound = true;
	} else {//finished final round
		gameOver = true;
	}
	console.log('c');
	//set phase
	if(gameOver) session.phase = "gameOver";
	else if(newRound) session.phase = "roundIntro";
	else {
		session.phase = "lying";
		setSessionQuestion(session);
	}
	console.log('d');
	//clear current question
	session.currentQuestion = null;
	console.log('e');
	//clear player lies and choices
	session.players.forEach(function (player) {
		player.lie = "";
		player.choice = "";
	})
	console.log('f');
	//update clients
	updateClientSessions(session.gameCode);
}
/*
var allLiesIn = function (session) {
	for(var i = 0; i < session.players.length; i++) {
		//return false if any don't have a lie
		if(session.players[i].lie.length <= 0) return false;
	}
	return true;
}

var allChoicesIn = function (session) {
	for(var i = 0; i < session.players.length; i++) {
		//return false if any don't have a choice
		if(session.players[i].choice.length <= 0) return false;
	}
	return true;
}
*/
var getSessionPlayer = function (session, username) {
	//find user in session
	var player = null;
	for(var i = 0; i < session.players.length; i++) {
		if(session.players[i].username == username) player = session.players[i];
	}
	return player;
}
var setSessionQuestion = function (session) {
	//console.log("questionSets: "+JSON.stringify(session.questionSets));
	//pick a random question set
	var rand = Math.floor(Math.random()*session.questionSets.length);
	//get the question set
	questionSetsModel.findOne({ _id: session.questionSets[rand].toObjectId() }, function (error, questionSet) {
		if(error) return null;//console.log("error: "+JSON.stringify(error));//error occured
		else {
			var isNew = false;
			while(!isNew) {
				//pick a random one from the question set
				var randa = Math.floor(Math.random()*questionSet.questions.length);
				//question id is the [question_set objectid]-[index]
				var randQuestionId = session.questionSets[rand]+"-"+randa;
				var question = questionSet.questions[randa];
				//verify it is new
				if(session.questionsAsked.indexOf(randQuestionId) == -1) isNew = true;
			}
			//set current question
			session.currentQuestion = question;
			//update questionsAsked
			session.questionsAsked.push(randQuestionId)
			//update clients
			updateClientSessions(session.gameCode);
		}
	})
}

var usernameExists = function (gameCode, username) {
	for(var i = 0; i < sessions[gameCode].players.length; i++) {
		if(sessions[gameCode].players[i].username == username) {
			//console.log("duplicate username: ("+sessions[gameCode].players[i].username+", "+username+")");
			return true;
		}
	}
	return false;
}

var validQuestionSets = function (questionSets) {
	//console.log("Valdiating question sets: "+JSON.stringify(questionSets));
	for(var i = 0; i < questionSets.length; i++) {
		questionSetsModel.findOne({ _id: questionSets[i].toObjectId() }, function (err, doc) {
			if(err) return false;
		});
	}
	return true;
}
var addGamePad = function (gameCode, username) {
	var index = sessions[gameCode].players.length;
	sessions[gameCode].players[index] = new player();
	sessions[gameCode].players[index].username = username; 
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