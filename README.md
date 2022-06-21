# <img src="public/icons/icon_48.png" width="45" align="left"> Checksum Verify

Automatically verify cryptographic digests of downloaded and uploaded files

## Install
First, install node dependencies  
`npm install`

Then, run the following to build the project:  
`export NODE_OPTIONS=--openssl-legacy-provider && webpack --mode=production --config config/webpack.config.js`   

For the moment being, markdown files from **md** folder have to be rendered to HTML and copied to **build** folder manually.  

To load the project in Chrome:  
1. Go to *Extensions* 
2. Click **Load Unpacked** 
3. Select **build** folder

---

This project was bootstrapped with [Chrome Extension CLI](https://github.com/dutiyesh/chrome-extension-cli)

