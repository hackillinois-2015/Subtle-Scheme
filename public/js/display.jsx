var Display = React.createClass({

    createRoom: function(data) {
        socket.emit('display join', JSON.stringify(data));
        // socket.emit('display join', JSON.stringify(['asdf']));
    },

    getSessionUpdate: function (data) {
        session = JSON.parse(data);

        var state = this.state;
        state.session = session;
        this.setState(state);

        console.log(session);

    },

    getInitialState: function() {
        socket.on('connect', function (data) {
            // socket.emit('display join');
        });

        socket.on('session update', this.getSessionUpdate);

        socket.on('bad question sets', function () {
            console.log('BAD was called');
        })

        return {
            session: {}
        }
    },

    tickToLying: function() {
        setTimeout(function() {
            socket.emit('roundIntro end');
        }, 2000);
    },

    render: function() {
        var session = this.state.session;

        switch(session.phase) {
            case "joining":
                var playerCount = session.players.length;
                return (
                    <div>
                        <div className="small-header">Waiting for players ({playerCount}/8)...</div>
                        <div className="joinNotice">
                            <div className="title">
                                The room code is : <div className="gamecode">{session.gameCode}</div>
                            </div>

                            <div className="content">
                                <p>Press <span className="everybody">EVERYBODY IS IN</span> to start the game.</p>
                                <p>Join on your phone or tablet at http://asdf.com/</p>
                            </div>
                        </div>
                        <DisplayLobby players={session.players}/>
                    </div>
                );
            case "roundIntro":
                this.tickToLying();
                var round = session.rounds[session.round];
                return (
                    <div className="questionTime">
                        <h3 className="title">{round.name}</h3>
                    </div>
                );
            case "lying":
                var progressBarWidth = {
                    width: '60%'
                }
                var round = session.rounds[session.round];

                return (
                    <div>
                        <div className="small-header">{round.name}</div>
                        <div className="lyingTime">
                            <h3 className="title">{session.currentQuestion.prompt}</h3>
                            <WaitingPlayerLies players={session.players} />
                        </div>
                    </div>
                );
                /*
                        <div className="progress">
                            <div className="progress-bar" role="progressbar" style={progressBarWidth}>
                                enter lies now
                            </div>
                        </div>
                */
            case "choosing":
                var round = session.rounds[session.round];
                return (
                    <div>
                        <div className="small-header">{round.name}</div>
                        <div className="choosingTime">
                            <h3 className="title">{session.currentQuestion.prompt}</h3>
                            <WaitingPlayerChoosing players={session.players} currentQuestion={session.currentQuestion} />
                        </div>
                    </div>
                );

            case "revealing":
                var round = session.rounds[session.round];
                return (
                    <div>
                        <div className="small-header">{round.name}</div>
                        <div className="revealingTime">
                            <h3 className="title">{session.currentQuestion.prompt}</h3>
                            <StartRevealing data={session} />
                        </div>
                    </div>
                );
            case "scoreboard":
                return (
                    <div>
                        <div className="small-header">Scoreboard</div>
                        <div className="scoreBoard">
                            <DisplayScores players={session.players} />
                        </div>
                    </div>
                );
            default:
                return (
                    <div>
                        <div className="small-header">Creating Room</div>
                        <PickQuestions onQuestionPick={this.createRoom} />
                    </div>
                );
        }

        return (
            <div>
                <div className="small-header">{this.state.status}</div>
            </div>
        );
    }
});

var PickQuestions = React.createClass({
    getInitialState: function()
    {
        $.ajax({
            url: '/questionSets',
            dataType: 'json',
            success: function(data) {
                var state = this.state;
                state.rooms = data;
                this.setState(state);
            }.bind(this)
        });

        return {
            rooms: {}
        }
    },

    handleSubmit: function(e)
    {
        e.preventDefault();

        var selected = [];

        $('form .checkbox:checked').each(function() {
            selected.push($(this).attr('id'));
        });

        this.props.onQuestionPick(selected);

    },

    render: function()
    {
        var rooms = this.state.rooms;

        var roomList = Object.keys(rooms).map(function(index) {
            var room = rooms[index];
            console.log(room);
            return (
                <div className="col-xs-4 text-center">
                    <div className="form-group">
                        <input className="form-control checkbox" type="checkbox" name="questionPack" id={"" + room._id} value={"" + room._id} />
                        <label htmlFor={"" + room._id}>{room.name}</label>
                    </div>
                </div>
            );
        });

        return(
            <form onSubmit={this.handleSubmit}>
                <h3 className="title text-center">Select Question Packs</h3>
                    <div className="row">
                        {roomList}
                    </div>
                <button type="submit" className="btn">
                    Create Room
                </button>
            </form>
        );
    }
});

var DisplayLobby = React.createClass({
    render: function() {
        var players = this.props.players;
        listPlayers = players.map(function(player) {
            return (
                <div className="col-xs-4 active">
                    <div className="playerLobbyItem">{player.username}</div>
                </div>
            );
        });

        for(var i = players.length; i <= 7; i++) {
            listPlayers.push(
                <div className="col-xs-4">
                    <div className="playerLobbyItem">?</div>
                </div>
            )
        }

        return (
            <div className="row playerLobby playerColor">
                {listPlayers}
            </div>
        );
    }
});

var WaitingPlayerLies = React.createClass({
    endLies: function() {
        setTimeout(function() {
            socket.emit('done lying');
        }, 1000)
    },

    render: function() {
        var players = this.props.players;
        var finishedUsers = 0;

        listPlayers = players.map(function(player) {
            var active = "";

            if(player.lie.length > 0) {
                active = "active";
                finishedUsers++;
            }

            return (
                <div className={"" + active}>
                    <div className="playerLobbyItem"></div>
                </div>
            );
        });

        var finishElement = [];

        if(finishedUsers == players.length) {
            finishElement.push(
                <div className="finished">All lies have been entered!</div>
            );

            this.endLies();
        }

        return (
            <div className="relative">
                {finishElement}
                <div className="WaitingPlayerLies playerColor">
                    {listPlayers}
                </div>
            </div>
        );
    }
});

var WaitingPlayerChoosing = React.createClass({
    endChoosing: function() {
        setTimeout(function() {
            socket.emit('done choosing');
        }, 1000)
    },

    render: function() {
        finishedUsers = 0;
        var players = this.props.players;
        var choices = [];

        listPlayers = players.map(function(player) {
            var active = "";

            if(player.choice.length > 0) {
                active = "active";
                finishedUsers++;
            }

            choices.push(
                <div className="col-xs-4">
                    <div className="choiceItems">{player.lie}</div>
                </div>
            );

            return (
                <div className={"" + active}>
                    <div className="playerLobbyItem"></div>
                </div>
            );
        });

        choices.push(
            <div className="col-xs-4">
                <div className="choiceItems">{this.props.currentQuestion.answer}</div>
            </div>
        );

        choices = shuffle(choices);

        var finishElement = [];

        if(finishedUsers == players.length) {
            finishElement.push(
                <div className="finished">Everyone has chosen!</div>
            );

            this.endChoosing();
        }

        return (
            <div className="relative">
                <div className="choiceList row">
                    {choices}
                </div>
                {finishElement}
                <div className="WaitingPlayerChoosing playerColor">
                    {listPlayers}
                </div>
            </div>
        );
    }
});

var StartRevealing = React.createClass({
    getInitialState: function() {
        var session = this.props.data;
        var answer = session.currentQuestion.answer;

        var failedPlayers = {};
        var rightPlayers = [];

        console.log('answer', answer);
        session.players.map(function(player, k) {
            console.log('chosen', player.choice, player.choice == answer);
            if(player.choice == answer) {
                rightPlayers.push({username: player.username, userId: k});
            } else {
                if(typeof failedPlayers[player.choice] == "undefined") {
                    failedPlayers[player.choice] = [];
                }

                failedPlayers[player.choice].push({username: player.username, userId: k});
            }
        });

        console.log('rightPlayers', rightPlayers);

        var list = [];
        session.players.map(function(player, k) {
            list.push({
                userId: k,
                username: player.username,
                lie: player.lie,
                reveal: false
            })
        });

        list.push({
            username: null,
            lie: session.currentQuestion.answer,
            reveal: false,
            answer: true
        });

        list = shuffle(list);

        this.list = list;

        return {
            revealedAnswers: [],
            failedPlayers: failedPlayers,
            rightPlayers: rightPlayers,
            current: "lieList"
        }
    },

    lieList: function() {

        list = this.list;

        var rtn = [];

        displayList = list.map(function(data) {
            rtn.push(
                <div className="col-xs-4">
                    <div className="choiceItems">{data.lie}</div>
                </div>
            );
        });

        setTimeout(function() {
            var state = this.state;
            state.current = "lieReveal";
            this.setState(state);
        }.bind(this), 2000)

        return rtn;
    },

    lieReveal: function() {
        var state = this.state;
        var list = this.list;
        var failedPlayers = state.failedPlayers;
        var rightPlayers = state.rightPlayers;
        var scrubs = [];

        if(typeof this.inc == "undefined") {
            this.inc = -1;
        }

        this.inc++;

        if(this.inc >= list.length) {
            setTimeout(function() {
                socket.emit('done revealing');
            }, 3000)

            if(rightPlayers.length !== 0) {
                rightPlayers.map(function(data) {
                    var styles = {
                        transform: 'rotate('+(Math.floor((Math.random() * 14) - 7))+'deg)'
                    };

                    scrubs.push(
                        <div className={"scrub player_" + (data.userId + 1)} style={styles}>
                            {data.username}
                        </div>
                    );
                });
            }

            return (
                <div className="col-xs-12">
                    <div className="singleChoice answer">
                        <div className="showAuthor">
                            Correct Answer:
                        </div>
                        {this.answer.lie}
                    </div>
                    <div className="showScrubs">
                        {scrubs}
                    </div>
                </div>
            );
        }

        if(list[this.inc].answer) {
            this.answer = list[this.inc];
            return this.lieReveal();
        }

        if(typeof failedPlayers[list[this.inc].lie] == "undefined" || failedPlayers[list[this.inc].lie].length === 0) {
            return this.lieReveal();
        }

        list[this.inc].reveal = true;

        var userCount = failedPlayers[list[this.inc].lie].length;

        failedPlayers[list[this.inc].lie].map(function(data, k) {
            var styles = {
                transform: 'rotate('+(Math.floor((Math.random() * 14) - 7))+'deg)'
            };

            scrubs.push(
                <div className={"scrub player_" + (data.userId + 1)} style={styles}>
                    {data.username}
                </div>
            );
        }.bind(this));

        this.list = list;

        setTimeout(function() {
            var state = this.state;
            state.current = "lieReveal";
            this.setState(state);
        }.bind(this), 3000)

        return (
            <div className="col-xs-12">
                <div className={"singleChoice player_" + (list[this.inc].userId + 1)}>
                    {list[this.inc].lie}
                    <div className="showAuthor">
                        By: {list[this.inc].username}
                    </div>
                </div>
                <div className="showScrubs">
                    {scrubs}
                </div>
            </div>
        );
    },

    render: function() {
        var render = "";
        if(this.state.current === "lieList") {
            render = this.lieList();
        } else if(this.state.current === "lieReveal") {
            render = this.lieReveal();
        }

        return (
            <div className="choiceList row">
                {render}
            </div>
        );
    }
});

var DisplayScores = React.createClass({
    componentDidMount: function() {
        setTimeout(function() {
            socket.emit('done showing scoreboard');
        }, 4000);
    },

    render: function() {
        var players = this.props.players;

        players.sort(function(a, b) {
            if (a.score < b.score) {
                return 1;
            }

            return 0;
        });

        playerList = this.props.players.map(function(player, k) {
            return (
                <div className={"playerBoardItem player_" + (k + 1)}>
                    <div className="playerName">{player.username}</div>
                    <div className="totalPoints">{player.score}</div>
                    <div className="clear"></div>
                </div>
            );
        });

        return (
            <div>
                {playerList}
            </div>
        );
    }
});

React.render(<Display />, document.getElementById('display'));