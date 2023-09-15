import React, {useEffect} from 'react';
import TokenList from "./TokenList";
import AddToken from "./AddToken";

const App = () => {

    const [page, setPage] = React.useState(0);
    const [addTokenInitData, setAddTokenInitData] = React.useState<any>(undefined);

    const signIn = (token: any, tabId: number) => {
        chrome.scripting.executeScript({target: {tabId: tabId}, func: () => {
            // @ts-ignore
            navigator.credentials.get({password: true}, "required").then((key) => {
                if (key === null)
                    return null;
                // @ts-ignore
                chrome.runtime.sendMessage({type: 'generateOTP', secret: key.password, submit: true});
            });
        }});
    }

    useEffect(() => {
        chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
            const url = tabs[0].url?.replace('https://', '').replace('http://', '').replace('www.', '');
            if (url === undefined || tabs[0] === undefined) return;
            const tokens = (await chrome.storage.sync.get(['tokens'])).tokens;
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
                });
            }
        });
    }, []);

    return (
        <>
            {page === 0 && <TokenList addHandler={() => setPage(1)}/>}
            {page === 1 && <AddToken backHandler={() => setPage(0)} initData={addTokenInitData} />}
        </>
    );
}

export default App;
