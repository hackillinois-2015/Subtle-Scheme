var socket = io.connect('http://localhost');

var Gamepad = React.createClass({

    formHandle: function(e) {
        e.preventDefault();
        var username = this.refs.username.getDOMNode().value.trim();
        var gameCode = this.refs.gameCode.getDOMNode().value.trim();

        var sendTo = {
            username: username,
            gameCode: gameCode
        };

        console.log('sendTo', sendTo);

        socket.emit('gamepad join', JSON.stringify(sendTo));
    },

    getSessionUpdate: function (data) {
        session = JSON.parse(data);

        var state = this.state;
        state.session = session;

        console.log(session);

        this.setState(state);
    },

    getInitialState: function() {
        socket.on('connect', function (data) {
        });

        socket.on('session update', this.getSessionUpdate);

        socket.on('alert', function (data) {
            console.log('alert', data);
        });

        socket.on('bad game code', function (data) {
            console.log('badcode', data);
        })

        socket.on('duplicate username', function (data) {
            console.log('duplicate username', data);
        })

        return {
            session: {}
        }
    },

    clickEveryoneIn: function() {
        socket.emit('everybody in');
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
                var question = session.questionSets[session.question];
                return (
                    <div className="questionTime">
                        <div className="title">{question}</div>
                    </div>
                );
            default:
                return (
                    <div>
                        <div className="small-header">Join Room</div>
                        <form onSubmit={this.formHandle}>
                            <div className="form-group">
                                <input type="text" className="form-control" ref="username" placeholder="username" />
                            </div>
                            <div className="form-group">
                                <input type="text" className="form-control makeUppercase" ref="gameCode" placeholder="gameCode" maxLength="4" size="4" keyup="javascript:this.value=this.value.toUpperCase();" />
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

$(document).on('keyup', '.makeUppercase', function() {
    this.value = this.value.toUpperCase();
});

React.render(<Gamepad />, document.getElementById('gamepad'));