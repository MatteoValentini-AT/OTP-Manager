![OTP Manager](public/img/banner.png)
## Features
- Securely stores your OTP secrets in Chrome's storage
- Login to your OTP-protected accounts with just two clicks
- Uses encryption and the Web Credential Management API to keep your secrets safe

## Installation
1) download the latest [release]([https://github.com/MatteoValentini-AT/OTP-Manager/releases/](https://github.com/MatteoValentini-AT/OTP-Manager/releases/download/v1.0.1/OTP.Manager.v1.0.1.zip)
2) unzip the file
3) open the [extensions page](chrome://extensions)
4) enable developer mode
5) click "load unpacked" and select the unzipped folder
6) pin the extension to your toolbar

## Usage
### Adding a new OTP secret
1) click the OTP-Manager extension icon
2) click the "Add new" button and follow the instructions

### Logging in to an OTP-protected account
1) When prompted to enter a OTP code, click the OTP-Manager extension icon
2) Select OTP Manager from the list of available credentials

For some websites, you may need to click into the OTP field before clicking the extension icon.

## Upgrading

Currently, the extension does **not** update itself. After a new [release](https://github.com/MatteoValentini-AT/OTP-Manager/releases/) is published, follow the following steps:
1) close all instaces of chrome
2) extract the downloaded zip and replace all extension files with the new ones
3) start chrome, all your data will still be persisted

## Security
### How are my secrets stored?
On first launch, OTP Manager generates a ```AES-GCM``` key and stores it in the extension's storage.
This key is used to encrypt your secrets before they are stored on the page itself using the Web Credential API. 
The key is never stored in plaintext, and is only accessible to the extension itself when the user invokes the extension and selects the identity.

### How are my secrets transmitted?
When the user invokes the extension to generate a OTP token, the extension request the encrypted secret from the page.
To fulfill this request, the user has to confirm by selecting the OTP Manager identity from the list of available credentials.
Then, the extension decrypts the secret and generates the OTP token, which is then sent back to the page. 
None of your secrets are sent to any third party servers, and the extension only communicates with the page itself.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

## Development
1) clone the repository
2) run ```npm install```
3) run ```npm run build``` to build the extension
4) add the extension to chrome by following the instructions in the [installation](#installation) section. After each new build, you will have to reload the extension on the ```chrome://extensions``` page
