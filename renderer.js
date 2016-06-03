const irc = require("tmi.js");
const {ipcRenderer} = require('electron');
const request = require('request');

var credentials = ipcRenderer.sendSync('request-credentials', true);

var client;
var joiners = [];
var sounds = [
  {
    id: 1,
    command: '!sad',
    path: '/Users/alexlanzoni/downloads/sadtrombone.mp3',
    cost: 0
  },
  {
    id: 2,
    command: '!genji',
    path: '/Users/alexlanzoni/downloads/253.ogg',
    cost: 0
  },
  {
    id: 3,
    command: '!welcome',
    path: '/Users/alexlanzoni/downloads/fine.ogg',
    cost: 0
  },
  {
    id: 4,
    command: '!bastion',
    path: '/Users/alexlanzoni/downloads/Bastion Ultimate.ogg',
    cost: 0
  },
  {
    id: 5,
    command: '!dropthebeat',
    path: '/Users/alexlanzoni/downloads/Let\'s Drop the Beat.ogg',
    cost: 0
  }
]
window.sounds = sounds;

var config = document.getElementById('config');
var sounds_elem = document.getElementById('sounds');
var welcome_elem = document.getElementById('welcome');
var followers_elem = document.getElementById('followers');
var subscribers_elem = document.getElementById('subscribers');

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

config.appendChild(bot_config_elem);
config.appendChild(hide_config);

function renderSounds(){
  sounds.forEach(function(sound){
    var sound_container = document.createElement('div');
    sound_container.classList.add('sound-container');
    var sound_player = document.createElement('audio');
    sound_player.src = sound.path;
    sound_player.setAttribute('controls', true);
    
    var sound_command = document.createElement('span');
    sound_command.innerHTML = sound.command;
    
    var sound_cost = document.createElement('span');
    sound_cost.innerHTML = sound.cost;
    
    sound_container.appendChild(sound_player);
    sound_container.appendChild(sound_command);
    sound_container.appendChild(sound_cost);
    
    sound.element = sound_player;
    
    sounds_elem.appendChild(sound_container);
    
  });
}
renderSounds();


var add_sound = document.getElementById('add-sound');
add_sound.addEventListener('click', function(e){
  console.log("wants to add sound");
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
    ipcRenderer.sendSync('save-credentials', {username, key, channel});
    // join_elem.innerHTML = 'Joined!';
    bot_config_elem.removeChild(join_elem);
  });
  client.on("join", function (channel, username) {
    joiners.unshift(username);
    ipcRenderer.sendSync("save-joiners", {joiners});
    updateJoiners();
  });
  client.on("subscription", function(channel, username){
    var sub_elem = document.createElement('div');
    sub_elem.innerHTML = username;
    subscribers_elem.appendChild(sub_elem);
  });
}

function onChat(channel, user, message, self){
  console.log(`${user.username}: ${message}`);
  sounds.forEach(sound => {
    if( message.includes( sound.command ) ){
      sound.element.play();
    }
  });
}

function updateJoiners(){
  var last_joiners = joiners.slice(0, 10);
  welcome_elem.innerHTML = '';
  last_joiners.forEach(joiner => {
    var joiner_elem = document.createElement('div');
    joiner_elem.innerHTML = joiner;
    welcome_elem.appendChild(joiner_elem);
  });
}

setInterval(function(){
  console.log('getting follows');
  request(`https://api.twitch.tv/kraken/channels/${credentials.channel.replace('#', '')}/follows`, function(err, response, body){
    followers_elem.innerHTML = '';
    var obj = JSON.parse(body);
    console.log(obj);
    obj.follows.forEach(follow => {
      var follow_elem = document.createElement('div');
      var created_at = new Date(follow.created_at);
      follow_elem.innerHTML = follow.user.name + ' ' + created_at.toLocaleString();
      followers_elem.appendChild(follow_elem);
    })
  });  
}, 300000);







