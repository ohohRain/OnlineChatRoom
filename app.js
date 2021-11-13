var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');


app.get('/', function (req, res) {
  res.sendfile('client.html');
});
app.use(express.static(path.join(__dirname, 'public')));

var users = [];
var socketArr = {};
var roomInfo = {};
var user = '';
var roomPasses = {};
var adminUser = {};
var banList = {};


io.on('connection', function (socket) {
  var roomID = "lobby";
  console.log('A user connected');
  socket.on('setUsername', function (data) {
    console.log(data);
    if (users.indexOf(data) > -1) { //if user exists
      socket.emit('userExists', data + ' username is taken! Try some other username.');
      console.log("User Exists!");
    }
    else {
      users.push(data);
      if (!roomInfo[roomID]) {
        roomInfo[roomID] = [];
      }
      user = data;
      socketArr[user] = socket.id;
      roomInfo[roomID].push(data);
      socket.join(roomID);
      io.to(roomID).emit('sys', data + ' joined the room ' + roomID, roomInfo[roomID]);
      console.log(data + ' joined ' + roomID + socketArr[user]);
      socket.emit('userSet', { username: data, roomID: roomID });
    }
  });
  socket.on('leave', function (data) {
    if (roomInfo[data.roomID].indexOf(data.user) === -1) {
      return -1;
    }
    var index = roomInfo[data.roomID].indexOf(data.user);
    if (index !== -1) {
      //console.log("removing");
      roomInfo[data.roomID].splice(index, 1);
    }
    console.log(roomInfo[data.roomID]);
    socket.leave(data.roomID);
    io.to(data.roomID).emit('sys', data.user + ' left the room ', roomInfo[data.roomID]);
    console.log(data.user + ' left ' + data.roomID);
  });


  socket.on('msg', function (data) {
    if (roomInfo[data.roomID].indexOf(data.user) === -1) {
      return false;
    }
    var msg = data.message;
    if(msg.includes(" :)")){
      msg = msg.replace(" :)", "😃")
     }
     
     if(msg.includes(" --")){
      msg = msg.replace(" :)", "😅")
     }
     
     if(msg.includes(" :(")){
      msg = msg.replace(" :)", "🙃")
     }
     
     if(msg.includes(" :D")){
      msg = msg.replace(" :)", "😊")
     }
     
     if(msg.includes(" :X")){
      msg = msg.replace(" :)", "😵")
     }
     
     if(msg == " :)"){
      msg = "😃"
     }
     if(msg == " --"){
      msg = "😅"
     }
     if(msg == " :("){
      msg = "🙃"
     }
     if(msg == " :D"){
      msg = "😊"
     }
     if(msg == " :X"){
      msg = "😵"
     }
    io.to(roomID).emit('newmsg', data);
  })

  socket.on('primsg', function (data) {
    if (roomInfo[data.roomID].indexOf(data.puid) === -1) {
      console.log("not in room");
      return -1;
    }
    
    var puid = data.puid;
    var sid = socketArr[puid];
    console.log(sid);
    socket.to(sid).emit('newprimsg', data);
  })

  socket.on('join', function (data) {
    if (banList[data.roomID]) {
      if (banList[data.roomID].indexOf(data.user) !== -1) {
        console.log("unable to join");
        return -1;
      }
      
    }
    if (roomPasses[data.roomID]) {
      if (data.roomPass !== roomPasses[data.roomID]) {
        console.log("password wrong!");
        return -1;
      }
    }

    roomID = data.roomID;
    var admin = 0;
    if (!roomInfo[roomID]) {
      roomInfo[roomID] = [];
      adminUser[roomID] = data.user;
    }
    if (adminUser[roomID] === data.user) {
      admin = 1;
    }
    user = data.user;
    roomInfo[roomID].push(user);
    socket.join(data.roomID);
    io.to(roomID).emit('sys', user + ' join the room ' + roomID, roomInfo[roomID]);
    console.log(user + ' joined ' + roomID);

    socket.emit('userSet', { username: user, roomID: roomID, admin: admin });



  });

  socket.on('joinPass', function (data) {
    if (banList[data.roomID]) {
      if (banList[data.roomID].indexOf(data.user) !== -1) {
        console.log("unable to join");
        return -1;
      }
      
    }
    if (!adminUser[data.roomID]) {
      if (!roomPasses[data.roomID]) {
        roomPasses[data.roomID] = data.roomPass;
        console.log("password set!");
      }
    }
    if (roomPasses[data.roomID]) {
      if (data.roomPass !== roomPasses[data.roomID]) {
        console.log("password wrong!");
        return -1;
      }
    }
    roomID = data.roomID;
    var admin = 0
    if (!roomInfo[roomID]) {
      roomInfo[roomID] = [];
      adminUser[roomID] = data.user;
    }
    if (adminUser[roomID] === data.user) {
      admin = 1;
    }
    user = data.user;
    roomInfo[roomID].push(user);
    socket.join(data.roomID);
    io.to(roomID).emit('sys', user + ' join the room ' + roomID, roomInfo[roomID]);
    console.log(user + ' joined ' + roomID);

    socket.emit('userSet', { username: user, roomID: roomID, admin: admin });

  });

  socket.on('kick', function (data) {
    if (data.user === adminUser[data.roomID]) {
      var index = roomInfo[data.roomID].indexOf(data.kickID);
      if (index !== -1) {
        roomInfo[data.roomID].splice(index, 1);
      }

      io.to(data.roomID).emit('sys', data.kickID + ' has been kicked from the room ', roomInfo[data.roomID]);
      var puid = data.kickID;
      var sid = socketArr[puid];
      io.in(sid).socketsLeave(data.roomID);
      socket.to(sid).emit('sys', 'You have been kicked from the room ', roomInfo[data.roomID]);
      console.log(data.user + ' kicked ' + data.kickID);
    }

  });

  socket.on('ban', function (data) {
    if (data.user === adminUser[data.roomID]) {
      var index = roomInfo[data.roomID].indexOf(data.banID);
      if (index !== -1) {
        roomInfo[data.roomID].splice(index, 1);
      }
      
      if (!banList[data.roomID]) {
        banList[data.roomID] = [];
      }
      var puid = data.banID;
      banList[data.roomID].push(puid);
      io.to(data.roomID).emit('sys', data.banID + ' has been banned from the room ', roomInfo[data.roomID]);
      var sid = socketArr[puid];
      io.in(sid).socketsLeave(data.roomID);
      socket.to(sid).emit('sys', 'You have been banned from the room ', roomInfo[data.roomID]);
      console.log(data.user + ' banned ' + data.banID);
    }

  });

  socket.on('admin', function (data) {
    if (data.user === adminUser[data.roomID]) {
      adminUser[data.roomID] = data.adminID;
      var puid = data.adminID;
      io.to(data.roomID).emit('sys', data.adminID + ' has been promoted as the new Admin ', roomInfo[data.roomID]);
      var sid = socketArr[puid];
      socket.to(sid).emit('sys', 'You have been promoted as the new Admin ', roomInfo[data.roomID]);
      socket.to(sid).emit('newAdmin');
      console.log(data.user + ' adminned ' + data.adminID);
      
    }

  });

});
http.listen(3456, function () {
  console.log('listening on localhost:3456');
});
