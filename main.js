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
  
  
  // const {dialog} = require('electron');
  // 
  // dialog.showOpenDialog(mainWindow, {
  //   title: 'thetitle',
  //   filters: [
  //     {name: 'Audio', extensions: ['ogg', 'mp3']}
  //   ],
  //   buttonLabel: 'Select Sound',
  //   properties: ['multiSelections', 'openFile']
  // }, function(filenames){
  //   console.log(filenames);
  // });

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

ipcMain.on('save-credentials', (event, arg) => {
  console.log(arg);  // prints "ping"
  event.returnValue = 'saved';
  
  fs.writeFile(`${__dirname}/credentials.json`, JSON.stringify(arg), (err) => {
    if (err) throw err;
    console.log('It\'s saved!');
  });
  
});

ipcMain.on('request-credentials', (event, arg) => {
  fs.readFile(`${__dirname}/credentials.json`, 'utf-8', (err, data) => {
    if(err){ 
      return event.returnValue = false;
    }
    console.log('data', data);
    event.returnValue = JSON.parse(data);
  });
});

ipcMain.on('save-joiners', (event, arg) => {
  var joinertxt = arg.joiners.join('\n');
  event.returnValue = 'saved';
  fs.writeFile(`${__dirname}/joiners.txt`, joinertxt, err => {
    if(err) throw err;
    console.log('joiners saved');
  });
});



