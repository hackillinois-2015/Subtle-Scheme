var whoami;

var Gamepad = React.createClass({

    formHandle: function(e) {
        e.preventDefault();
        var username = this.refs.username.getDOMNode().value.trim();
        var gameCode = this.refs.gameCode.getDOMNode().value.trim();

        var sendTo = {
            username: username,
            gameCode: gameCode
        };

        whoami = username;

        socket.emit('gamepad join', JSON.stringify(sendTo));
    },

    getSessionUpdate: function (data) {
        session = JSON.parse(data);

        var state = this.state;
        state.session = session;

        this.setState(state);
    },

    getInitialState: function() {
        socket.on('connect', function (data) {
        });

        socket.on('session update', this.getSessionUpdate);

        socket.on('alert', function (data) {
        });

        socket.on('bad game code', function (data) {
        })

        socket.on('duplicate username', function (data) {
        })

        return {
            session: {}
        }
    },

    clickEveryoneIn: function() {
        socket.emit('everybody in');
    },

    sendInLie: function(data) {
        socket.emit('submit lie', data);
    },

    render: function() {
        var session = this.state.session;
        // var listSessions = Object.keys(session).map(function(index) {
        //     return (
        //         <div>
        //             {index}: {session[index]}
        //         </div>
        //     );
        // });

        switch(session.phase) {
            case "joining":
                return (
                    <div>
                        <div className="small-header">You are in!</div>
                        <button onClick={this.clickEveryoneIn} className="btn">EVERYONE IS IN</button>
                    </div>
                );
            case "roundIntro":
                var round = session.rounds[session.round];
                return (
                    <div className="questionTime">
                        <div className="title">{round.name}</div>
                    </div>
                );
            case "lying":
                var question = session.currentQuestion;

                return (
                    <div className="questionTime">
                        <div className="title">{question.prompt}</div>
                        <LyingForm sendLie={this.sendInLie} answer={question.answer} players={session.players} />
                    </div>
                );
            case "choosing":
                var question = session.currentQuestion;
                return (
                    <div className="choosingTime">
                        <div className="title">{question.prompt}</div>
                        <ChoosingForm currentQuestion={question} sendChoosing={this.sendInChoosing} players={session.players} />
                    </div>
                );
            case "revealing":
            case "scoreboard":
            case "gameOver":
                return (
                    <div className="notice">
                        Answers and Lies are being revealed in the main screen.
                    </div>
                );
            default:
                return (
                    <div>
                        <div className="small-header">Join Room</div>
                        <form onSubmit={this.formHandle}>
                            <div className="form-group">
                                <label htmlFor="username">Username</label>
                                <input type="text" className="form-control" id="username" ref="username" placeholder="username" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="gameCode">Game Code</label>
                                <input type="text" className="form-control makeUppercase" id="gameCode" ref="gameCode" placeholder="gameCode" maxLength="4" size="4" keyup="javascript:this.value=this.value.toUpperCase();" />
                            </div>
                            <div className="form-group">
                                <button type="submit" className="btn">Enter</button>
                            </div>
                        </form>
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

var LyingForm = React.createClass({
    formHandle: function(e) {
        e.preventDefault();

        var lieText = this.refs.lieText.getDOMNode().value.trim();

        var alert = undefined;

        if(lieText.length == 0) {
            alert = "Please enter in a LIE!";
            var state = this.state;
            state.alert = alert;
            this.setState(state);
            return;
        }

        if(lieText.toLowerCase().replace(/\s/g, '') == this.props.answer.toLowerCase().replace(/\s/g, '')) {
            alert = "You picked either a lie or a truth! Please enter something else.";
        }

        var players = this.props.players;

        for(var i = 0; i < players.length; i++) {
            var player = players[i];

            if(player.lie.toLowerCase().replace(/\s/g, '') == lieText.toLowerCase().replace(/\s/g, '')) {
                alert = "You picked either a lie or a truth! Please enter something else.";
            }
        }

        var state = this.state;
        state.alert = alert;
        this.setState(state);

        if(typeof alert != "undefined") {
            return;
        }

        this.setState({
            sent: true,
            alert: undefined
        });

        this.props.sendLie(lieText);
    },

    getInitialState: function() {
        return {sent: false, alert: undefined};
    },

    render: function() {
        if(this.state.sent) {
            return (
                <div className="notice">Lie has been submitted</div>
            );
        }

        var alert = this.state.alert;
        var alertElement = [];

        if(typeof alert != "undefined") {
            alertElement.push(
                <div className="notice-red">{alert}</div>
            );
        }

        return (
            <form onSubmit={this.formHandle}>
                {alertElement}
                <div className="form-group">
                    <input type="text" className="form-control" ref="lieText" placeholder="Lie!" />
                </div>
                <div className="form-group">
                    <button type="submit" className="btn">Enter Lie</button>
                </div>
            </form>
        );
    }
});

var ChoosingForm = React.createClass({
    removeForm: function() {
        this.setState({remove: true});
    },

    getInitialState: function() {
        return {remove: false}
    },

    render: function() {
        if(this.state.remove) {
            return (
                <div className="choiceList">
                    <div className="notice">You have successfully chosen an answer!</div>
                </div>
            );
        }

        var choices = [];
        var currentQuestion = this.props.currentQuestion;

        if(typeof this.choices == "undefined") {

            this.props.players.map(function(player) {
                if(player.username != whoami) {
                    choices.push(
                        <ChoosingButton onButtonChosen={this.removeForm} answer={player.lie} />
                    );
                }
            }.bind(this))

            choices.push(
                <ChoosingButton onButtonChosen={this.removeForm} answer={currentQuestion.answer} />
            );

            this.choices = shuffle(choices);
        }

        choices = this.choices;

        return (
            <div className="choiceList">
                {choices}
            </div>
        );
    }
});

var ChoosingButton = React.createClass({
    buttonHandle: function() {
        socket.emit('submit choice', this.props.answer);
        this.props.onButtonChosen();
    },

    render: function() {
        return (
            <button onClick={this.buttonHandle} className="btn choiceItems">{this.props.answer}</button>
        );
    }
});

$(document).on('keyup', '.makeUppercase', function() {
    this.value = this.value.toUpperCase();
});

React.render(<Gamepad />, document.getElementById('gamepad'));