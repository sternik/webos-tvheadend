import React, { useEffect, useRef } from 'react';
import '../styles/app.css';

const ChannelHeader = (props: { channelNumberText: string; unmount: () => void }) => {
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        timeoutRef.current = setTimeout(() => props.unmount(), 5000);
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [props.channelNumberText]);

    return (
        <div id="channelheader-wrapper" tabIndex={-1} className="channelHeader">
            <span className="ch-number">{props.channelNumberText}</span>
        </div>
    );
};

export default ChannelHeader;
