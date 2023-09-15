import OTPEntry from "./OTPEntry";
import React, {useEffect} from "react";

const TokenList = (props: {
    addHandler: () => void,
}) => {

    const [tokens, setTokens] = React.useState<any>(undefined);
    const [canAdd, setCanAdd] = React.useState<boolean>(true);

    useEffect(() => {
        chrome.storage.sync.get('tokens', (result) => {
            setTokens(result['tokens']);
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                if (tabs[0].url?.startsWith('chrome://')) {
                    setCanAdd(false);
                    return;
                }
                const url = tabs[0].url?.replace('https://', '').replace('http://', '').replace('www.', '');
                result['tokens'].forEach((token: any) => {
                    if (url && url.startsWith(token.url)) {
                        setCanAdd(false);
                    }
                });
            });
        });
    }, []);

    return (
        <div className='min-h-[320px]'>
            <div className="flex">
                <img src="/img/logo.svg" className="w-12 h-12 -ml-1 mr-4" alt=""></img>
                <div className="flex flex-col">
                    <span className="text-xl font-bold text-white">OTP Manager</span>
                    <span className="text-xs text-zinc-400 font-mono">by Matteo Valentini</span>
                </div>
            </div>
            <div className="flex justify-between mt-4 border-b-2 border-zinc-400">
                <span className="text-sm text-zinc-200">Stored OTPs</span>
                { canAdd && <span className="text-sm text-[#e4154b] hover:text-[#ff1744] hover:cursor-pointer" onClick={props.addHandler}>Add new</span> }
            </div>
            <div className="flex flex-col mt-1 overflow-x-hidden">
                {tokens && tokens.map((token: any) => {
                    return (
                        <OTPEntry icon={token.icon} page={token.name} user={token.user}/>
                    );
                })}
            </div>
        </div>
    );
}

export default TokenList;