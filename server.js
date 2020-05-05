const express = require('express'),
    colors = require("colors"),
    bodyParser = require("body-parser"),
    methodOverride = require("method-override"),
    hbs = require('handlebars'),
    moment = require('helper-moment'),
    exphbs = require("express-handlebars"),
    routes = require("./controllers/ps_controller.js"),
    chatbot = require("./webhook"),
    app = express(),
    port = process.env.PORT || 3000,
    fixtures = require('./scripts/fixture_patient'),
    db = require('./models'),
    session = require('express-session'),
    passport = require('./config/passport'),
    http = require('http').createServer(app),
    io = require('socket.io')(http);

app.use(express.static("public"));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));

// Override with POST having ?_method=DELETE
app.use(methodOverride("_method"));
app.use(session({ secret: "keyboard cat", resave: true, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

app.use("/", routes);
// app.use("/api/chat/", chatbot);

let usernames = {};
let connections = [];

io.sockets.on('connection', socket => {

    socket.on('subscribe', room => {
        console.log("joining room", room);
        socket.join(room);
    })


    connections.push(socket);
    console.log("Connected: %s sockets connected", connections.length);

    // disconnect
    socket.on('disconnect', data => {

        connections.splice(connections.indexOf(socket), 1);
        console.log("Disconnected: %s sockets connected", connections.length);
        // remove the username from global usernames list
        delete usernames[socket.username];
        // update list of users in chat, client-side
        io.sockets.emit('updateusers', usernames);
        // echo globally that this client has left
        socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
    });

    // send message
    socket.on('send message', (message, username, avatar) => {
        io.sockets.emit('new message', username, avatar, { msg: message });
        // socket.broadcast.emit('broad', data);

        db.message.create({
            username: username,
            message: message,
            avatar: avatar,
        })
    })

    // typing
    socket.on('typing', data => {
        socket.broadcast.emit('typing', data);
    })

    socket.on('adduser', (username) => {
        // we store the username in the socket session for this client
        socket.username = username;
        // add the client's username to the global list
        usernames[username] = username;
        // echo to client they've connected
        socket.emit('updatechat', 'SERVER', 'you have connected');
        // echo globally (all clients) that a person has connected
        socket.broadcast.emit('updatechat', 'SERVER', username + ' has connected');
        // update the list of users in chat, client-side
        io.sockets.emit('updateusers', usernames);
    });
});

hbs.registerHelper('ifEquals', function(arg1, arg2, options) {
    return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});

hbs.registerHelper('moment', require('helper-moment'));

app.use((req, res, next) => {
    res.status(404)
    res.render("error")
})

// app.post("/testdf", function(req, res) {
//     var speech =
//         req.body.queryResult &&
//         req.body.queryResult.parameters &&
//         req.body.queryResult.parameters.echoText
//             ? req.body.queryResult.parameters.echoText
//             : "Seems like some problem. Speak again.";
//
//     var speechResponse = {
//         google: {
//             expectUserResponse: true,
//             richResponse: {
//                 items: [
//                     {
//                         simpleResponse: {
//                             textToSpeech: speech
//                         }
//                     }
//                 ]
//             }
//         }
//     };
//
//     return res.json({
//         payload: speechResponse,
//         //data: speechResponse,
//         fulfillmentText: speech,
//         speech: speech,
//         displayText: speech,
//         source: "webhook-echo-sample"
//     });
// });

db.sequelize.sync( { force: true } )
    .then(fixtures)
    .then(() => {
        http.listen(port, () => { console.log(`==> 🌎 Listening on PORT ${port}. Visit http://localhost:${port}`.green) });
    });

process.on('SIGTERM', () => {
    listener.close(() => {
        console.log('Closing http server.');
        process.exit(0);
    });
});