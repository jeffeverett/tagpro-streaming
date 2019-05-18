const os = require('os')
const fs = require('fs-extra')
const path = require('path')
const { spawn, exec } = require('child_process')
const util = require('util')
const secrets = require('../secrets')
const profileTemplate = require('../obs_templates/profile_template')
const sceneCollectionTemplate = require('../obs_templates/scene_collection_template')

const execPromise = util.promisify(exec)

let usedTwitchUsernames = new Set([])

exports.startOBSStream = async (PID) => {
  // Select Twitch username from pool of created account
  const twitchUsername = Object.keys(secrets.TWITCH_ACCOUNTS).find(username => !usedTwitchUsernames.has(username))
  if (twitchUsername === undefined) {
    throw new Error('Error: All Twitch accounts are being used.')
  }
  const streamKey = secrets.TWITCH_ACCOUNTS[twitchUsername]

  // Determine XID from PID
  const { stdout, _ } = await execPromise('wmctrl -l -p')
  let XID = -1
  stdout.split('\n').forEach(line => {
    const cells = line.split(/(\s+)/).filter(str => str.trim().length > 0)
    const linePID = cells[2]
    if (parseInt(linePID) === PID) {
      XID = cells[0]
    }
  })
  if (XID === -1) {
    throw new Error('Could not determine XID for browser window.')
  }
  const decimalXID = parseInt(XID, 16)

  // Prepare configuration files
  prepareProfile(twitchUsername, streamKey)
  prepareSceneCollection(twitchUsername, decimalXID)

  return spawn('obs', [
    '--startstreaming', '--portable', '--profile', twitchUsername, '--collection', twitchUsername
  ])
}

const prepareProfile = (twitchUsername, streamKey) => {
  let profile = profileTemplate
  profile.settings.key = streamKey
  const filename = `${os.homedir()}/.config/obs-studio/basic/profiles/${twitchUsername}/service.json`
  fs.mkdirpSync(path.dirname(filename))
  fs.writeFileSync(filename, JSON.stringify(profile))
}

const prepareSceneCollection = (twitchUsername, decimalXID) => {
  let sceneCollection = sceneCollectionTemplate
  sceneCollection.name = twitchUsername
  sceneCollection.sources[1].settings.capture_window = `${decimalXID}\r\nTagproStream\r\nobs`
  const filename = `${os.homedir()}/.config/obs-studio/basic/scenes/${twitchUsername}.json`
  fs.mkdirpSync(path.dirname(filename))
  fs.writeFileSync(filename, JSON.stringify(sceneCollection))
}