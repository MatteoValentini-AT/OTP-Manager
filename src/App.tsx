import React, {useEffect, useState} from 'react';
import TokenList from "./TokenList";
import AddToken from "./AddToken";

const App = () => {

	const [page, setPage] = React.useState(0);
	const [addTokenInitData, setAddTokenInitData] = React.useState<any>(undefined);

	const signIn = (token: any, tabId: number) => {
		chrome.scripting.executeScript({
			target: {tabId: tabId}, func: () => {
				// @ts-ignore
				navigator.credentials.get({password: true}, "required").then((key) => {
					if (key === null)
						return null;
					// @ts-ignore
					chrome.runtime.sendMessage({type: 'generateOTP', secret: key.password, submit: true});
				});
			}
		});
	}

	const [showContent, setShowContent] = useState(false);

	useEffect(() => {
		chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
			const url = tabs[0].url?.replace('https://', '').replace('http://', '').replace('www.', '');
			if (url === undefined || tabs[0] === undefined) {
				setShowContent(true);
				return;
			}
			const tokens = (await chrome.storage.sync.get(['tokens'])).tokens;
            if (tokens === undefined) {
                setShowContent(true);
                setPage(0);
                return;
            }
			const token = tokens.find((token: any) => url.startsWith(token.url));
			if (token)
				signIn(token, tabs[0].id as number);
			else if (url) {
				chrome.storage.local.get(null, (result) => {
					if (result['addToken']) {
						if (url.startsWith(result['addToken']['page'])) {
							setAddTokenInitData(result['addToken']);
							setPage(1);
						} else {
							chrome.storage.local.remove('addToken');
							setPage(0)
						}
					}
					setShowContent(true)
				});
			} else
				setShowContent(true);
		});
	}, []);

	return (
		<>
			{showContent && page === 0 && <TokenList addHandler={() => setPage(1)}/>}
			{showContent && page === 1 && <AddToken backHandler={() => setPage(0)} initData={addTokenInitData}/>}
			{!showContent && <div className='h-8 bg-[url(/img/loading.gif)] bg-cover bg-center bg-no-repeat -mt-4 -mb-5'/>}
		</>
	);
}

export default App;
