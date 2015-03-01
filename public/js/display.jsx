var socket = io.connect('http://localhost');

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
                return (
                    <div>
                        <div className="small-header">{round.name}</div>
                        <WaitingPlayerChoosing players={session.players} />
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
            <div className="WaitingPlayerLies playerColor">
                {finishElement}
                {listPlayers}
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
        listPlayers = players.map(function(player) {
            var active = "";

            if(player.choice.length > 0) {
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
                <div className="finished">Everyone has chosen!</div>
            );

            this.endChoosing();
        }

        return (
            <div className="WaitingPlayerChoosing playerColor">
                {finishElement}
                {listPlayers}
            </div>
        );
    }
});

React.render(<Display />, document.getElementById('display'));