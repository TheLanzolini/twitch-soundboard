const irc = require("tmi.js");
const {ipcRenderer} = require('electron');
const request = require('request');
const {dialog} = require('electron').remote;

const webview = document.getElementById('webview');
const indicator = document.querySelector('.indicator');

let token, client, channel, soundQueue = [], messageQueue = [], timeouts = {}, TIMEOUT_TIME = 10000;

const container = document.getElementById('container');

const uriToJSON = function(uriString){
  return JSON.parse('{"' + decodeURI(uriString).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g,'":"') + '"}');
}

const loadstart = () => {
  indicator.innerText = 'Loading...';
  // SHOW loading icon
};

const loadstop = () => {
  indicator.innerText = '';
  // Hide loading icon
};

const fetchTwitchUser = (token) => {
  return fetch('https://api.twitch.tv/kraken/user', {method: 'GET', headers: { 'Accept': 'application/vnd.twitchtv.v3+json', 'Authorization': 'OAuth '+token }})
    .then(function(response){
      return response.json();
    }).catch(function(err){
      console.log('parsing failed', err);
    });
}

const onRedirect = (e) => {
  if(e.newURL.includes('http://localhost/#access_token=')){
    token = e.newURL.replace('http://localhost/#access_token=', '').replace('&scope=chat_login+user_read','');
    fetchTwitchUser(token).then(res => {
      channel = res.name;
      joinChannel(res.name, token, res.name);
      renderSoundBoard();
    });
  }
};

webview.addEventListener('did-start-loading', loadstart);
webview.addEventListener('did-stop-loading', loadstop);
webview.addEventListener('did-get-redirect-request', onRedirect);

var sounds = ipcRenderer.sendSync('request-sounds', true).sounds || [];

function renderSoundBoard(){
  var logout = document.createElement('button');
  logout.setAttribute('id', 'logout');
  logout.innerHTML = 'Logout';
  logout.addEventListener('click', function(){
    ipcRenderer.sendSync('request-logout', true);
  });
  container.innerHTML = '';
  var sounds_elem = document.createElement('div');
  sounds_elem.setAttribute('id', 'soundsContainer');
  container.appendChild(sounds_elem);
  container.insertBefore(logout, sounds_elem);
  renderSounds();
  renderAddSound();
}

function renderSounds(){
  var sounds_elem = document.getElementById('soundsContainer');
  sounds_elem.innerHTML = '';
  sounds.forEach(function(sound){
    var sound_container = document.createElement('div');
    sound_container.classList.add('sound-container');
    var sound_player = document.createElement('audio');
    sound_player.src = sound.path;
    sound_player.setAttribute('controls', true);
    
    var sound_command = document.createElement('span');
    sound_command.classList.add('command');
    sound_command.innerHTML = sound.command;
    
    var sound_delete = document.createElement('button');
    sound_delete.classList.add('delete');
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

function renderAddSound(){
  var newSoundModel = {};
  var new_sound_container = document.createElement('div');
  new_sound_container.classList.add('new-sound-container');
  var command_label = document.createElement('label');
  command_label.setAttribute('for', 'command-input');
  command_label.innerHTML = 'Command';
  var command_input = document.createElement('input');
  command_input.setAttribute('id', 'command-input');
  command_input.addEventListener('change', function(){
    newSoundModel.command = command_input.value;
  });
  var select_sound = document.createElement('button');
  select_sound.setAttribute('id', 'select-sound');
  select_sound.innerHTML = 'Select Sound';
  select_sound.addEventListener('click', function(){
    dialog.showOpenDialog({
      title: 'Select Sound Effect',
      filters: [{name: 'Audio', extensions: ['ogg', 'mp3']}],
      buttonLabel: 'Select Sound',
      properties: ['openFile']
    }, function(filenames){
      if(filenames){
        newSoundModel.path = filenames[0];
        select_sound.innerHTML = '-Selected';
      }
    });
  });
  var submit_sound = document.createElement('button');
  submit_sound.innerHTML = 'Submit';
  submit_sound.addEventListener('click', function(){
    if(newSoundModel.command && newSoundModel.path){
      sounds.push(newSoundModel);
      ipcRenderer.sendSync('save-sounds', {sounds});
      renderSounds();
      command_input.value = '';
      select_sound.innerHTML = 'Select Sound';
    }
  });
  new_sound_container.appendChild(command_label);
  new_sound_container.appendChild(command_input);
  new_sound_container.appendChild(select_sound);
  new_sound_container.appendChild(submit_sound);
  container.appendChild(new_sound_container);
}
const joinChannel = (username, key, channel) => {
  const options = {
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
    console.log('connected');
  });
}

function onChat(channel, user, message, self){
  var now = new Date().getTime();
  sounds.forEach(sound => {
    if(message.includes(sound.command)){
      if(!timeouts[user.username] || timeouts[user.username] < now){
        timeouts[user.username] = now + TIMEOUT_TIME;
        soundQueue.push({sound, message, user});
      }else if(timeouts[user.username] && timeouts[user.username] > now){
        messageQueue.push(`${user.username} your sound is on cooldown for ${timeouts[user.username] - now}`);
      }
      return;
    }
  });
}

setInterval(function(){
  if(soundQueue.length > 0){
    var first = soundQueue.shift();
    first.sound.element.play();
    console.log(`Sound message ${first.message}`);
    ipcRenderer.sendSync('latest-sound', first);
  }
}, 10000);

setInterval(function(){
  if(messageQueue.length > 0){
    var first = messageQueue.shift();
    client.say(channel, first);
  }
}, 2000);







