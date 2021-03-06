'use strict'
/* eslint-env browser, webextensions */

const enableRedirect = document.getElementById('enable-gateway-redirect')
const disableRedirect = document.getElementById('disable-gateway-redirect')
const openWebUI = document.getElementById('open-webui')
const openPreferences = document.getElementById('open-preferences')
const quickUpload = document.getElementById('quick-upload')

const ipfsIcon = document.getElementById('icon')
const ipfsIconOn = '../../icons/ipfs-logo-on.svg'
const ipfsIconOff = '../../icons/ipfs-logo-off.svg'
const offline = 'offline'

function show (id) {
  document.getElementById(id).classList.remove('hidden')
}

function hide (id) {
  document.getElementById(id).classList.add('hidden')
}

function set (id, value) {
  document.getElementById(id).innerHTML = value
}

quickUpload.onclick = () => browser.tabs.create({ url: browser.extension.getURL('src/popup/quick-upload.html') })

enableRedirect.onclick = () => browser.storage.local.set({useCustomGateway: true})
  .then(updatePopup)
  .catch(error => { console.error(`Unable to update redirect state due to ${error}`) })

disableRedirect.onclick = () => browser.storage.local.set({useCustomGateway: false})
  .then(updatePopup)
  .catch(error => { console.error(`Unable to update redirect state due to ${error}`) })

openWebUI.onclick = () => {
  browser.storage.local.get('ipfsApiUrl')
    .then(options => {
      const apiUrl = options['ipfsApiUrl']
      browser.tabs.create({ url: apiUrl + '/webui/' })
      window.close()
    })
    .catch(error => {
      console.error(`Unable Open Web UI due to ${error}`)
    })
}

openPreferences.onclick = () => {
  browser.runtime.openOptionsPage().then(() => window.close())
}

function updatePopup () {
  // update redirect status
  browser.storage.local.get('useCustomGateway')
    .then(options => {
      const enabled = options['useCustomGateway']
      if (enabled) {
        hide('redirect-disabled')
        hide('enable-gateway-redirect')
        show('redirect-enabled')
        show('disable-gateway-redirect')
      } else {
        hide('redirect-enabled')
        hide('disable-gateway-redirect')
        show('redirect-disabled')
        show('enable-gateway-redirect')
      }
    })
    .catch(error => {
      console.error(`Unable update redirect state due to ${error}`)
    })

  // update gateway addresss
  browser.storage.local.get('customGatewayUrl')
    .then(options => { set('gateway-address-val', options['customGatewayUrl']) })
    .catch(() => { set('gateway-address-val', '???') })

  browser.runtime.getBackgroundPage()
    .then(background => {
      if (background.ipfs) {
        // update gateway version
        background.ipfs.version()
          .then(v => { set('gateway-version-val', (v.commit ? v.version + '/' + v.commit : v.version)) })
          .catch(() => { set('gateway-version-val', offline) })
        // update swarm peer count
        background.getSwarmPeerCount()
          .then(peerCount => {
            // update peer counter
            set('swarm-peers-val', peerCount < 0 ? offline : peerCount)
            ipfsIcon.src = peerCount > 0 ? ipfsIconOn : ipfsIconOff
            if (peerCount > 0) {
              show('quick-upload')
            } else {
              hide('quick-upload')
            }
          })
          .catch(error => {
            console.error(`Unable update peer count due to ${error}`)
          })
      }
    })
    .catch(error => {
      console.error(`Error while accessing background page: ${error}`)
    })
}

// run on initial popup load
updatePopup()

// listen to any changes and update diagnostics
browser.alarms.onAlarm.addListener(updatePopup)
