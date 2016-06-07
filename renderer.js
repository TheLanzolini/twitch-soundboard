const irc = require("tmi.js");
const {ipcRenderer} = require('electron');
const request = require('request');
const {dialog} = require('electron').remote;

var credentials = ipcRenderer.sendSync('request-credentials', true);

var sounds = ipcRenderer.sendSync('request-sounds', true).sounds || [];

var TIMEOUT_TIME = credentials.TIMEOUT_TIME || 600000;

var client;
var joiners = [];
var sound_queue = [];
var message_queue = [];
var timeouts = {};

var config = document.getElementById('config');
var sounds_elem = document.getElementById('sounds');

var bot_config_elem = document.createElement('div');
var username_elem = document.createElement('div');
var username_label = document.createElement('label');
var username_input = document.createElement('input');
username_input.setAttribute('id', 'username-input');
username_input.setAttribute('type', 'text');
username_label.innerHTML = 'Bot Username';
username_label.setAttribute('for', 'username-input');

if(!!credentials && credentials.username){
  username_input.value = credentials.username;
}

username_elem.appendChild(username_label);
username_elem.appendChild(username_input);

var oauth_elem = document.createElement('div');
var oauth_label = document.createElement('label');
var oauth_input = document.createElement('input');

oauth_input.setAttribute('id', 'oauth-input');
oauth_input.setAttribute('type', 'password');
oauth_label.innerHTML = 'Oauth Key';
oauth_label.setAttribute('for', 'oauth-input');

if(!!credentials && credentials.key){
  oauth_input.value = credentials.key;
}

oauth_elem.appendChild(oauth_label);
oauth_elem.appendChild(oauth_input);

var channel_elem = document.createElement('div');
var channel_label = document.createElement('label');
var channel_input = document.createElement('input');

channel_input.setAttribute('id', 'channel-input');
channel_input.setAttribute('type', 'text');
channel_label.innerHTML = 'Channel';
channel_label.setAttribute('for', 'channel-input');

if(!!credentials && credentials.channel){
  channel_input.value = credentials.channel;
}

channel_elem.appendChild(channel_label);
channel_elem.appendChild(channel_input);

var timeout_elem = document.createElement('div');
var timeout_label = document.createElement('label');
var timeout_input = document.createElement('input');

timeout_input.value = TIMEOUT_TIME;

timeout_input.addEventListener('change', function(){
  TIMEOUT_TIME = parseInt(timeout_input.value);

});

timeout_input.setAttribute('id', 'timeout-input');
timeout_input.setAttribute('type', 'number');
timeout_label.innerHTML = 'Timeout (in milliseconds)';
timeout_label.setAttribute('for', 'timeout-input');

timeout_elem.appendChild(timeout_label);
timeout_elem.appendChild(timeout_input);

var join_elem = document.createElement('button');
join_elem.innerHTML = 'Join';
join_elem.addEventListener('click', function(e){
  joinChannel(username_input.value, oauth_input.value, channel_input.value);
});

var bot_config_hidden = false;
var hide_config = document.createElement('span');
hide_config.style.display = 'block';
hide_config.innerHTML = 'Hide Config';
hide_config.addEventListener('click', function(e){
  if(bot_config_hidden){
    hide_config.innerHTML = 'Hide Config';
    bot_config_elem.style.display = 'block';
    bot_config_hidden = false;
  }else{
    hide_config.innerHTML = 'Show Config';
    bot_config_elem.style.display = 'none';
    bot_config_hidden = true;
  }
});

bot_config_elem.appendChild(username_elem);
bot_config_elem.appendChild(oauth_elem);
bot_config_elem.appendChild(channel_elem);
bot_config_elem.appendChild(join_elem);
bot_config_elem.appendChild(timeout_elem);

config.appendChild(bot_config_elem);
config.appendChild(hide_config);

function renderSounds(){
  sounds_elem.innerHTML = '';
  sounds.forEach(function(sound){
    var sound_container = document.createElement('div');
    sound_container.classList.add('sound-container');
    var sound_player = document.createElement('audio');
    sound_player.src = sound.path;
    sound_player.setAttribute('controls', true);
    
    var sound_command = document.createElement('span');
    sound_command.innerHTML = sound.command;
    
    var sound_delete = document.createElement('span');
    sound_delete.innerHTML = 'Delete';
    sound_delete.addEventListener('click', function(){
      sounds.splice( sounds.indexOf(sound), 1 );
      ipcRenderer.sendSync('save-sounds', {sounds});
      renderSounds();
    });
    
    sound_container.appendChild(sound_player);
    sound_container.appendChild(sound_command);
    sound_container.appendChild(sound_delete);
    
    sound.element = sound_player;
    
    sounds_elem.appendChild(sound_container);
    
  });
}
renderSounds();

var newSoundModel = {id: sounds.length + 1};
var select_sound = document.getElementById('select-sound');
select_sound.addEventListener('click', function(e){
  console.log("wants to add sound");
  dialog.showOpenDialog({
    title: 'thetitle',
    filters: [
      {name: 'Audio', extensions: ['ogg', 'mp3']}
    ],
    buttonLabel: 'Select Sound',
    properties: ['openFile']
  }, function(filenames){
    console.log(filenames);
    if(filenames){
      newSoundModel.path = filenames[0];
      select_sound.innerHTML = filenames[0];
    }
  });
});
var command_input = document.getElementById('command-input');
command_input.addEventListener('change', function(){
  newSoundModel.command = command_input.value;
});
var sound_submit = document.getElementById('sound-submit');
sound_submit.addEventListener('click', function(){
  if(newSoundModel.path && newSoundModel.command){
    sounds.push(newSoundModel);
    ipcRenderer.sendSync('save-sounds', {sounds});
    select_sound.innerHTML = 'Select Sound';
    command_input.value = '';
    newSoundModel = {};
    renderSounds();
  }else{
    console.log('needs either command or path');
  }
});


function joinChannel(username, key, channel){
  // oauth:u919tdncow0ag7dhzu7mdg59d16stp
  var options = {
    options: {
        debug: true
    },
    connection: {
        cluster: "aws",
        reconnect: true
    },
    identity: {
        username: username,
        password: key
    },
    channels: [channel]
  };
  client = new irc.client(options);
  client.connect();
  client.on("chat", onChat);
  client.on("connected", function(address, port){
    ipcRenderer.sendSync('save-credentials', {username, key, channel, TIMEOUT_TIME});
    bot_config_elem.removeChild(join_elem);
  });
}

function onChat(channel, user, message, self){
  var now = new Date().getTime();
  sounds.forEach(sound => {
    if(message.includes(sound.command)){
      if(!timeouts[user.username] || timeouts[user.username] < now){
        timeouts[user.username] = now + TIMEOUT_TIME;
        sound_queue.push({sound, message, user});
      }else if(timeouts[user.username] && timeouts[user.username] > now){
        message_queue.push(`${user.username} your sound is on cooldown for ${timeouts[user.username] - now}`);
      }
      return;
    }
  });
}

setInterval(function(){
  if(sound_queue.length > 0){
    var first = sound_queue.shift();
    first.sound.element.play();
    console.log(`Sound message ${first.message}`);
    ipcRenderer.sendSync('latest-sound', first);
  }
}, 10000);

setInterval(function(){
  if(message_queue.length > 0){
    var first = message_queue.shift();
    client.say(channel_input.value, first);
  }
}, 2000);

// function updateJoiners(){
//   var last_joiners = joiners.slice(0, 10);
//   welcome_elem.innerHTML = '';
//   last_joiners.forEach(joiner => {
//     var joiner_elem = document.createElement('div');
//     joiner_elem.innerHTML = joiner;
//     welcome_elem.appendChild(joiner_elem);
//   });
// }

// setInterval(function(){
//   console.log('getting follows');
//   request(`https://api.twitch.tv/kraken/channels/${credentials.channel.replace('#', '')}/follows`, function(err, response, body){
//     followers_elem.innerHTML = '';
//     var obj = JSON.parse(body);
//     console.log(obj);
//     obj.follows.forEach(follow => {
//       var follow_elem = document.createElement('div');
//       var created_at = new Date(follow.created_at);
//       follow_elem.innerHTML = follow.user.name + ' ' + created_at.toLocaleString();
//       followers_elem.appendChild(follow_elem);
//     })
//   });  
// }, 300000);







