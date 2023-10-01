import totp from 'totp-generator';

let key = undefined;
let keyLoading = false;
const callbacks = [];

const getKey = async () => {
    if (key)
        return key;
    if (keyLoading)
        return new Promise((resolve) => {
            callbacks.push(resolve);
        });
    keyLoading = true;
    return new Promise((resolve) => {
        chrome.storage.sync.get(null, async (result) => {
            if (result.key === undefined) {
                key = await crypto.subtle.generateKey({
                    name: "AES-GCM",
                    length: 256,
                }, true, ["encrypt", "decrypt"]);
                result.key = await crypto.subtle.exportKey("jwk", key);
                result.tokens = [];
                chrome.storage.sync.set(result).then(() => {
                    console.log("Key generated and saved");
                });
            } else {
                key = await crypto.subtle.importKey("jwk", result.key, {
                    name: "AES-GCM",
                    length: 256,
                }, false, ["decrypt"]);
                console.log("Key loaded", key);
            }
            keyLoading = false;
            callbacks.forEach((callback) => callback(key));
            resolve(key);
        });
    });
}

const base64ToArrayBuffer = (base64) => {
    const binary_string = atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.type === 'generateOTP') {
        const url = sender.tab.url?.replace('https://', '').replace('http://', '').replace('www.', '');
        console.log('Generating OTP token for: ' + url);
        const tokens = (await chrome.storage.sync.get(['tokens'])).tokens;
        const token = tokens.find((token) => url.startsWith(token.url));
        crypto.subtle.decrypt({
            name: "AES-GCM",
            iv: new Uint8Array(token.iv),
        }, await getKey(), base64ToArrayBuffer(request.secret))
            .then((decrypted) => {
                const secret = new TextDecoder().decode(decrypted);
                const otp = totp(secret, {
                    period: token.period,
                    algorithm: token.algorithm.replace('sha1', 'SHA-1').replace('sha256', 'SHA-256').replace('sha512', 'SHA-512'),
                    digits: token.digits,
                })
                chrome.scripting.executeScript({
                    target: {tabId: sender.tab.id},
                    func: (otp, target, submit) => {
                        const element = target.startsWith('#') ? document.getElementById(target.substring(1)) : document.getElementsByTagName(target.substring(1))[0];
                        element.focus();
                        element.select();
                        element.dispatchEvent(new InputEvent('input', {
                            inputType: 'insertText',
                            data: otp,
                        }));
                        element.value = otp;
                        element.dispatchEvent(new Event('change'));
                        if (submit) {
                            let parent = element.parentElement;
                            while (!(parent instanceof HTMLFormElement)) {
                                if (parent === null || parent instanceof HTMLBodyElement)
                                    return;
                                parent = parent.parentElement;
                            }
                            parent.submit();
                        }
                    },
                    args: [otp, token.target, request.submit],
                });
            }).catch(async (error) => {
                console.log(error);
            });
    }
    if (request.type === 'log') {
        console.log(request.message);
    }
});