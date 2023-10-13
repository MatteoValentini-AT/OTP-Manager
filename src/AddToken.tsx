import React, {useEffect, useRef, useState} from "react";
import QrScanner from 'qr-scanner';

const AddToken = (props: {
	backHandler: () => void,
	initData?: {
		page: string,
		target: string,
		icon: string,
		progress: number,
	}
}) => {

	const [page, setPage] = useState<string>(props.initData?.page || '');
	const [progress, setProgress] = useState<number>(props.initData?.progress || 1);
	const [pageIcon, setPageIcon] = useState<string>(props.initData?.icon || '');
	const [target, setTarget] = useState<string>(props.initData?.target || '');
	const [qrCodeError, setQrCodeError] = useState<boolean>(false);

	const fileSelector = useRef<HTMLInputElement>(null);
	const secretToStore = useRef<string>('');

	useEffect(() => {
		try {
			chrome.tabs.query({active: true, currentWindow: true}).then((tabs) => {
				if (tabs[0].url) {
					setPage(tabs[0].url?.split('#')[0].split('?')[0].split(';')[0].replaceAll('https://', '').replaceAll('http://', '').replaceAll('www.', '').replaceAll(/\/$/g, ''));
				}
			});
		} catch (e) {
		}
	}, []);

	const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
		var binary = '';
		var bytes = new Uint8Array(buffer);
		var len = bytes.byteLength;
		for (var i = 0; i < len; i++)
			binary += String.fromCharCode(bytes[i]);
		return btoa(binary);
	}

	const addToken = (secret: string, pageName: string, user: string, algorithm: string, digits: number, period: number) => {
		return new Promise<string>((resolve, reject) => {
			chrome.storage.sync.get(null, async (result) => {
				const tokens = result.tokens || [];
				const key = await crypto.subtle.importKey("jwk", result.key, {
					name: "AES-GCM",
					length: 256,
				}, true, ["encrypt", "decrypt"]);
				const iv = crypto.getRandomValues(new Uint8Array(12));
				const encryptedSecret = await crypto.subtle.encrypt({
					name: "AES-GCM",
					iv: iv,
				}, key, new TextEncoder().encode(secret));
				tokens.push({
					url: page,
					target: target,
					icon: pageIcon,
					iv: Array.from(iv),
					user: user,
					name: pageName,
					algorithm: algorithm,
					digits: digits,
					period: period,
				});
				chrome.storage.sync.set({'tokens': tokens});
				resolve(arrayBufferToBase64(encryptedSecret));
			});
		});
	}

	const storeToken = (encryptedSecret: string) => {
		chrome.tabs.query({active: true, currentWindow: true}).then((tabs) => {
			if (tabs[0] && tabs[0].id)
				chrome.scripting.executeScript({
					target: {tabId: tabs[0].id as number}, func: (encryptedSecret) => {
						try {
							// @ts-ignore
							navigator.credentials.store(new PasswordCredential({
								id: 'OTP Manager',
								password: encryptedSecret,
								name: 'OTP Manager',
								iconURL: 'https://static.matteovalentini.at/cdn/software/otpmanager/icon.png'
							})).then(() => {
								chrome.runtime.sendMessage({type: 'generateOTP', secret: encryptedSecret, submit: false});
							}).catch((e) => {
								chrome.runtime.sendMessage({type: 'log', message: e})
							});
						} catch (e) {
							console.log(e);
						}
					}, args: [encryptedSecret]
				});
		});
	}

	const selectElement = () => {
		return new Promise<string>((resolveElement, reject) => {
			chrome.tabs.query({active: true, currentWindow: true}).then((tabs) => {
				if (tabs[0] && tabs[0].id)
					chrome.scripting.executeScript({
						target: {tabId: tabs[0].id as number}, func: () => {
							return new Promise((resolve, reject) => {
								let lastTarget: HTMLElement | null = null;
								let oldStyle: any = null;
								let mouseListener = (e: any) => {
									if (lastTarget) {
										lastTarget.style.backgroundColor = oldStyle;
										lastTarget.removeEventListener('click', clickListener);
									}
									if (!(e.target instanceof HTMLInputElement)) return;
									lastTarget = e.target as HTMLElement;
									oldStyle = lastTarget.style.backgroundColor;
									lastTarget.style.backgroundColor = '#e4154b';
									lastTarget.addEventListener('click', clickListener);
								};
								let clickListener: any = (e: MouseEvent) => {
									e.preventDefault();
									e.stopPropagation();
									const id = lastTarget?.id;
									if (id) {
										resolve('#' + id);
									} else if (document.getElementsByTagName('input').length == 1) {
										resolve('!input');
									} else {
										resolve(undefined);
									}
									document.removeEventListener('mouseover', mouseListener);
									lastTarget?.removeEventListener('click', clickListener);
									// @ts-ignore
									lastTarget.style.backgroundColor = oldStyle;
								};
								document.addEventListener('mouseover', mouseListener);
							});
						}, args: []
					}).then((result) => {
						if (result[0].result)
							resolveElement(result[0].result as string);
					});
			});
		});
	}

	const nextPage = () => {
		if (progress == 1) {
			const pageURL = new URL('https://' + page.replaceAll('sso.', ''));
			const icon = 'https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://' + pageURL.hostname + '/&size=64';
			selectElement().then(async (result) => {
				setProgress(progress + 1);
				setTarget(result as string);
				await chrome.storage.local.set({
					['addToken']: {
						page: page,
						target: result,
						icon: icon,
						progress: 3
					}
				});
			});
		}
		if (progress < 3) setProgress(progress + 1)
	}

	const backHandler = () => {
		if (progress > 1) setProgress(progress - 1)
		else {
			chrome.storage.local.remove('addToken');
			props.backHandler();
		}
		if (progress === 2) {
			chrome.storage.local.set({
				['addToken']: {
					page: '',
					target: '',
					icon: '',
					progress: 1
				}
			});
			chrome.tabs.query({active: true, currentWindow: true}).then((tabs) => {
				chrome.scripting.executeScript({
					target: {tabId: tabs[0].id as number}, func: () => {
						window.location.reload();
					}, args: []
				});
			});
		}
		if (progress === 3) {
			chrome.storage.local.set({
				['addToken']: {
					page: page,
					target: '',
					icon: pageIcon,
					progress: 2
				}
			});
			selectElement().then((result) => {
				setProgress(progress + 1);
				chrome.storage.local.set({
					['addToken']: {
						page: page,
						target: result,
						icon: pageIcon,
						progress: 3
					}
				});
			});
		}
	}

	const processQRCode = (result: string) => {
		if (result.startsWith('otpauth://totp/')) {
			try {
				const pageName = decodeURI(result.split('issuer=')[1].split('&')[0]).replaceAll('ZID ', '')
				let user: string = result.includes('@') ? result.split('otpauth://totp/')[1].replaceAll('%40', '@').split('?')[0] : '';
				if (user.includes(':'))
					user = user.split(':')[1];
				if (user.length > 15)
					user = user.substring(0, 15) + '...';
				const secret: string = result.split('secret=')[1].split('&')[0];
				const algorithm: string = result.includes('algorithm=') ? result.split('algorithm=')[1].split('&')[0].toLowerCase() : 'sha1';
				const digits: number = result.includes('digits=') ? parseInt(result.split('digits=')[1].split('&')[0]) : 6;
				const period: number = result.includes('period=') ? parseInt(result.split('period=')[1].split('&')[0]) : 30;
				addToken(secret, pageName, user, algorithm, digits, period).then((encryptedSecret) => {
					chrome.storage.local.remove('addToken');
					setProgress(4)
					secretToStore.current = encryptedSecret;
				});
			} catch (e) {
				console.error(e);
			}
		}
	}

	return (
		<>
			<div className='flex'>
				<img src='/img/logo.svg' className='w-12 h-12 -ml-1 mr-4' alt=''></img>
				<div className='flex flex-col'>
					<span className='text-xl font-bold text-white'>OTP Manager</span>
					<span className='text-xs text-zinc-400 font-mono'>by Matteo Valentini</span>
				</div>
			</div>
			<div className='flex justify-between mt-4 border-b-2 border-zinc-400'>
				<span className='text-sm text-zinc-200'>Add token (Step {progress})</span>
				{progress < 4 && <span className='text-sm text-[#e4154b] hover:text-[#ff1744] hover:cursor-pointer' onClick={backHandler}>Back</span>}
			</div>
			{progress === 1 && <div className='flex flex-col mt-2'>
                <span className='text-sm text-white'>Please navigate to the page where you have to enter the OTP token, then click next.</span>
                <span className='text-sm text-zinc-400 my-1'>Current URL:</span>
                <p className='bg-zinc-200 text-black placeholder-zinc-700 rounded-sm px-1 pt-0.5 mb-3 text-sm h-16 break-all break-words whitespace-normal noselect'>{page}</p>
                <button className='bg-[#e4154b] rounded-md p-1 flex flex-col justify-center items-center hover:brightness-110 font-bold text-black'
                        onClick={nextPage}>Next
                </button>
            </div>}
			{progress === 2 && <div className='flex flex-col mt-2'>
                <span
                    className='text-sm text-white'>Please select the input for the OTP token on the page by clicking on it. Valid elements turn red when hovering over them.</span>
            </div>}
			{progress === 3 && <div className='flex flex-col items-center mt-2'>
                <span className='text-sm text-white'>Select the QR code which was generated when you enabled OTP / MFA.</span>
                <button className='w-3/5 mt-5 mb-3 bg-[#e4154b] rounded-md p-3 flex flex-col justify-center items-center group' onClick={() => fileSelector.current?.click()}>
                    <div className='w-full aspect-square bg-no-repeat bg-cover group-hover:invert'
                         style={{backgroundImage: 'url(' + chrome.runtime.getURL('img/qr-code.svg') + ')'}}
                    >
                        <div className='w-[38px] h-[38px] ml-[48px] mt-[48px] rounded-md bg-white p-[3px] group-hover:invert'>
                            <img src={pageIcon} className='pixelated subpixel-antialiased rounded-md w-full h-full'/>
                        </div>
                    </div>
                    <input type='file' className='w-0 h-0' ref={fileSelector} accept='image/*' onChange={(e) => {
						if (fileSelector.current?.files && fileSelector.current.files[0]) {
							const FR = new FileReader();
							FR.addEventListener('load', function (e) {
								QrScanner.scanImage(FR.result as any, {
									returnDetailedScanResult: true,
								}).then((result) => {
									processQRCode(result.data);
								}).catch((e) => {
									setQrCodeError(true);
								});
							});
							FR.readAsDataURL(fileSelector.current.files[0]);
						}
					}}/>
                </button>
				{qrCodeError && <span className='text-sm text-[#e4154b] font-bold mt-2'>Unable to process QR code.</span>}
            </div>}
			{progress === 4 && <div className='flex flex-col mt-2'>
                <span className='text-sm text-white'>In the next step after clicking "Next", you will have to press on "Save" to store the token.</span>
                <span
                    className='text-sm text-white my-4'>For future logins, simply click the extension icon and then select "OTP Manager" to generate and auto-fill the OTP token.
				</span>
                <button className='bg-[#e4154b] rounded-md p-1 flex flex-col justify-center items-center hover:brightness-110 font-bold text-black'
                        onClick={() => storeToken(secretToStore.current)}>Next
                </button>
            </div>}
			<img src={pageIcon} className='w-0 h-0'/>
		</>
	);
}

export default AddToken;