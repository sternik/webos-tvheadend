import React, { useContext, useRef } from 'react';
import AppContext from '../AppContext';
import EPGChannel from '../models/EPGChannel';
import EPGEvent from '../models/EPGEvent';
import EPGUtils from '../utils/EPGUtils';

const ChannelListDetails = (props: {
    isRecording: (event: EPGEvent) => boolean;
    currentEvent?: EPGEvent;
    epgChannel?: EPGChannel;
    nextEvents: EPGEvent[];
    nextSameEvents: EPGEvent[];
}) => {
    const { locale } = useContext(AppContext);
    const ref = useRef<HTMLDivElement>(null);

    const formatTime = (event: EPGEvent | undefined, date?: boolean): string | undefined => {
        if (!event) return undefined;
        const start = event.getStart();
        const end = event.getEnd();
        if (date) {
            return EPGUtils.toDateString(start, locale);
        } else {
            return EPGUtils.toTimeFrameString(start, end, locale);
        }
    };

    const getEventList = (events: EPGEvent[], withDate?: boolean) => {
        return events.map((event, i) => (
            <li key={i} className="cld-listItem">
                {withDate && <span className="cld-listDate">{formatTime(event, true)}</span>}
                <span className="cld-listTime">{formatTime(event)}</span>
                <span className="cld-listTitle">
                    {props.isRecording(event) && <span className="cld-recDot" />}
                    {event.getTitle()}
                </span>
            </li>
        ));
    };

    const title = props.currentEvent?.getTitle() || 'No Information';
    const sub = props.currentEvent?.getSubTitle() || '';
    const desc = props.currentEvent?.getDescription() || '';

    return (
        <div ref={ref} tabIndex={-1} className="channelListDetails">
            <div className="cld-header">
                <div className="cld-timeframe">
                    {props.currentEvent && formatTime(props.currentEvent, true) + '  ' + formatTime(props.currentEvent)}
                </div>
                <div className="cld-now">{EPGUtils.toTimeString(EPGUtils.getNow(), locale)}</div>
            </div>

            <div className="cld-title">
                {props.currentEvent && props.isRecording(props.currentEvent) && <span className="cld-recDot" />}
                {title}
            </div>

            {sub && <div className="cld-subtitle">{sub}</div>}

            <div className="cld-desc">{desc}</div>

            {props.nextEvents.length > 0 && (
                <div className="cld-next">
                    <div className="cld-nextLabel">Next</div>
                    <ul className="cld-list">{getEventList(props.nextEvents)}</ul>
                </div>
            )}
        </div>
    );
};

export default ChannelListDetails;
