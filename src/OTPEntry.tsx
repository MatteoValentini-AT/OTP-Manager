import React from "react";

const OTPEntry = (props: {
    icon: string,
    page: string,
    user: string,
}) => {
    return (
        <div className="flex mt-2">
            <img src={props.icon} className="w-8 h-8 mr-3 ml-1 rounded-md subpixel-antialiased" alt=""/>
            <div className="flex flex-col">
                <span className="text-md font-bold text-white leading-none overflow-ellipsis">{props.page}</span>
                <span className="text-sm text-zinc-400 font-mono overflow-ellipsis">{props.user}</span>
            </div>
        </div>
    );
}

export default OTPEntry;