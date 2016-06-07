const electron = require('electron')

const fs = require('fs')

const {ipcMain} = electron;

// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800, height: 600
  })

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html`)

  // Open the DevTools.
  mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.


function logout(){
  mainWindow.webContents.session.cookies.get({}, function(error, cookies){
    if(error){
      return console.log(error);
    }
    for(var i = cookies.length; i >= 0; i--){
      if(cookies[i]){
        var url = "http" + (cookies[i].secure ? "s" : "") + "://" +cookies[i].domain + cookies[i].path;
        var name = cookies[i].name;
        mainWindow.webContents.session.cookies.remove(url, name, function(error){
          if(error){
            return console.log(error);
          }
        });
      }
    }
  });
}

ipcMain.on('request-logout', (event,arg) => {
  event.returnValue = true;
  logout();
  mainWindow.reload();
});

ipcMain.on('save-credentials', (event, arg) => {
  event.returnValue = 'saved';
  
  fs.writeFile(`${__dirname}/credentials.json`, JSON.stringify(arg), (err) => {
    if (err) throw err;
  });
  
});

ipcMain.on('request-credentials', (event, arg) => {
  fs.readFile(`${__dirname}/credentials.json`, 'utf-8', (err, data) => {
    if(err){ 
      return event.returnValue = false;
    }
    event.returnValue = JSON.parse(data);
  });
});

ipcMain.on('request-sounds', (event, arg) => {
  fs.readFile(`${__dirname}/sounds.json`, 'utf-8', (err, data) => {
    if(err){ 
      return event.returnValue = false;
    }
    event.returnValue = JSON.parse(data);
  });
});

ipcMain.on('save-sounds', (event, arg) => {
  event.returnValue = 'saved';
  fs.writeFile(`${__dirname}/sounds.json`, JSON.stringify(arg), (err) => {
    if (err) throw err;
  });
});

ipcMain.on('latest-sound', (event, arg) => {
  event.returnValue = 'saved';
  const latest = `${arg.user.username}: ${arg.message}`;
  fs.writeFile(`${__dirname}/latest.txt`, latest, (err) => {
    if (err) throw err;
  });
});



